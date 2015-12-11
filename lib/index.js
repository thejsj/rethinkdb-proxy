/*jshint esnext:true, bitwise:false */
'use strict';

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _Promise = require('babel-runtime/core-js/promise')['default'];

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

Object.defineProperty(exports, '__esModule', {
  value: true
});

require('babel/polyfill');

var _net = require('net');

var _net2 = _interopRequireDefault(_net);

var _rethinkdbProtoDef = require('rethinkdb/proto-def');

var _rethinkdbProtoDef2 = _interopRequireDefault(_rethinkdbProtoDef);

var _bufferParser = require('./buffer-parser');

var _bufferParser2 = _interopRequireDefault(_bufferParser);

var _queryParser = require('./query-parser');

var _optionsParser = require('./options-parser');

var _optionsParser2 = _interopRequireDefault(_optionsParser);

var _loggerJs = require('./logger.js');

var _loggerJs2 = _interopRequireDefault(_loggerJs);

var RethinkDBProxy = (function () {
  function RethinkDBProxy(opts) {
    _classCallCheck(this, RethinkDBProxy);

    // Set defaults and unallowedTerms
    this.opts = (0, _optionsParser2['default'])(opts);
    this.logger = new _loggerJs2['default'](opts.inLevel, opts.outLevel, opts.sysLevel);
    this.__connections = [];
    this.server = _net2['default'].createServer(this.connectionHandler.bind(this));
    return this;
  }

  _createClass(RethinkDBProxy, [{
    key: 'listen',
    value: function listen(cb) {
      var _this = this;

      return new _Promise(function (resolve, reject) {
        _this.server.listen(_this.opts.port, function (err) {
          if (err) {
            _this.logger.sys.info({ err: err, port: _this.opts.port }, 'Error tryingg to listen for traffic');
            if (typeof cb === 'function') cb(err);
            reject(err);
          }
          _this.logger.sys.info({ port: _this.opts.port }, 'server.listen');
          if (typeof cb === 'function') cb();
          resolve();
        });
      });
    }
  }, {
    key: 'close',
    value: function close(cb) {
      var _this2 = this;

      return new _Promise(function (resolve, reject) {
        _this2.server.close(function () {
          _this2.logger.sys.info('server.close');
          if (typeof cb === 'function') cb();
          resolve();
        });
        setTimeout(function () {
          _this2.logger.sys.info('Server closing all connections');
          _this2.__connections.forEach(function (conn) {
            this.logger.sys.trace({ conn: conn }, 'conn.destroy');
            conn.destroy();
          });
        }, 100);
      });
    }
  }, {
    key: 'makeSendResponse',
    value: function makeSendResponse(socket) {
      var _this3 = this;

      return function (response, token) {
        _this3.logger.out.info({
          token: token,
          response: response
        }, 'Send Response');
        var tokenBuffer = new Buffer(8);
        tokenBuffer.writeUInt32LE(token & 0xFFFFFFFF, 0);
        tokenBuffer.writeUInt32LE(Math.floor(token / 0xFFFFFFFF), 4);
        var responseBuffer = new Buffer(JSON.stringify(response));
        var lengthBuffer = new Buffer(4);
        lengthBuffer.writeUInt32LE(responseBuffer.length, 0);
        if (socket.destroyed) return;
        socket.write(tokenBuffer);
        socket.write(lengthBuffer);
        socket.write(responseBuffer);
      };
    }
  }, {
    key: 'makeSendError',
    value: function makeSendError(clientSocket) {
      var _this4 = this;

      var sendResponseToClient = this.makeSendResponse(clientSocket);
      return function (token, message) {
        var response = {
          t: _rethinkdbProtoDef2['default'].Response.ResponseType.CLIENT_ERROR,
          b: [],
          n: [],
          r: [message]
        };
        _this4.logger.out.info({
          message: message,
          response: response,
          token: token
        }, 'Send Error');
        sendResponseToClient(response, token);
      };
    }
  }, {
    key: 'connectionHandler',
    value: function connectionHandler(clientSocket) {
      var _this5 = this;

      this.__connections.push(clientSocket);

      clientSocket.connected = false;
      var parser = new _bufferParser2['default']();
      var serverSocket = _net2['default'].connect(this.opts.rdbPort, this.opts.rdbHost);
      var sendResponseToServer = this.makeSendResponse(serverSocket);
      var sendResponseToClient = this.makeSendResponse(clientSocket);
      var sendError = this.makeSendError(clientSocket);

      /*!
       * Listeners
       */
      serverSocket.on('data', function (buff) {
        _this5.logger.out.info({
          buffer: buff.toString()
        }, 'Data received');
        if (buff.toString() === 'SUCCESS') clientSocket.connected = true;
        // NOTE: The socket might try to write something even if the connection
        // is closed
        if (clientSocket.destroyed) return;
        clientSocket.write(buff);
      });

      parser.on('connect', function (version, authKey, protoProtocol) {
        _this5.logger['in'].info({
          version: version,
          authKey: authKey,
          protoProtocol: protoProtocol
        }, 'parser.on.connect');
        var versionBuffer = new Buffer(4);
        versionBuffer.writeUInt32LE(version, 0);
        var authBuffer = new Buffer(authKey, 'ascii');
        var authLengthBuffer = new Buffer(4);
        authLengthBuffer.writeUInt32LE(authBuffer.length, 0);
        var protocolBuffer = new Buffer(4);
        protocolBuffer.writeUInt32LE(protoProtocol, 0);
        var token = Buffer.concat([versionBuffer, authLengthBuffer, authBuffer, protocolBuffer]);
        if (protoProtocol !== _rethinkdbProtoDef2['default'].VersionDummy.Protocol.JSON) {
          sendError(token, 'Proxy Error: Only JSON protocol allowed.');
        }
        serverSocket.write(token);
      });

      parser.on('error', function (token) {
        _this5.logger['in'].error({
          token: token
        }, 'parser.on.error');
        sendError('Proxy Error: Could not parse query correctly.');
      });

      parser.on('query', function (query, token) {
        _this5.logger['in'].info({
          query: query,
          token: token
        }, 'parser.on.query');
        var termsFound = (0, _queryParser.findTermsOrErrors)(_this5.opts, _this5.opts.unallowedTerms, query);
        if (termsFound.length > 0) {
          // This shouldn't throw an error. It should
          // send the error through the TCP connection
          var errorMessage = undefined;
          if (typeof termsFound[0] === 'object' && typeof termsFound[0].error === 'string') {
            errorMessage = termsFound[0].error;
          } else {
            errorMessage = 'Cannot execute query. "' + termsFound + '" query not allowed.';
          }
          _this5.logger['in'].warn({
            termsFound: termsFound,
            errorMessage: errorMessage
          }, 'parser.on.query Error');
          sendError(token, errorMessage);
        }
        return sendResponseToServer(query, token);
      });

      clientSocket.on('data', function (data) {
        _this5.logger['in'].trace({
          data: data
        }, 'clientSocket.on.data');
        return parser.append(data);
      });
    }
  }]);

  return RethinkDBProxy;
})();

exports['default'] = RethinkDBProxy;
module.exports = exports['default'];