'use strict';

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

var _componentsBufferParser = require('./components/buffer-parser');

var _componentsBufferParser2 = _interopRequireDefault(_componentsBufferParser);

var _node_modulesRethinkdbProtoDef = require('../node_modules/rethinkdb/proto-def');

var _node_modulesRethinkdbProtoDef2 = _interopRequireDefault(_node_modulesRethinkdbProtoDef);

require('should');

describe('Buffer Parser', function () {

  var parser = undefined;
  var parseQuery = function parseQuery() {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    var result = [];
    var cb = args.pop();
    parser.on('query', function (query) {
      result.push(query);
    });
    var count = 0;
    for (var key in args) {
      if (args.hasOwnProperty(key)) {
        var value = args[key];
        var token = count++;
        var tokenBuffer = new Buffer(8);
        tokenBuffer.writeUInt32LE(Math.floor(token / 0xFFFFFFFF), 4);
        var byteLengthBuffer = new Buffer(4);
        var queryBuffer = new Buffer(JSON.stringify(value));
        byteLengthBuffer.writeUInt32LE(queryBuffer.length, 0);
        parser.append(Buffer.concat([tokenBuffer, byteLengthBuffer, queryBuffer]));
      }
    }
    cb(result);
  };

  beforeEach(function () {
    parser = new _componentsBufferParser2['default']();
    var version = new Buffer(4);
    version.writeUInt32LE(_node_modulesRethinkdbProtoDef2['default'].VersionDummy.Version.VO_4, 0);
    var auth_buffer = new Buffer('', 'ascii');
    var auth_length = new Buffer(4);
    auth_length.writeUInt32LE(auth_buffer.length, 0);
    var protocol = new Buffer(4);
    protocol.writeUInt32LE(_node_modulesRethinkdbProtoDef2['default'].VersionDummy.Protocol.JSON, 0);
    var token = Buffer.concat([version, auth_length, auth_buffer, protocol]);
    parser.append(token);
  });

  it('should correctly parse a single buffer', function () {
    var value = [[1]];
    parseQuery(value, function (result) {
      result[0].should.eql(value);
    });
  });

  it('should correctly parse a multiples buffers', function () {
    var value0 = [[1]];
    var value1 = [1, [3, [4, [3]]]];
    var value2 = [1, [3, [4, [3]]]];
    parseQuery(value0, value1, value2, function (result) {
      result[0].should.eql(value0);
      result[1].should.eql(value1);
      result[2].should.eql(value2);
    });
  });

  it('should correctly parse a parser with `]` inside the bytelength/token`', function () {
    var value = [1, [51, [[39, [[15, [[14, ['rethinkdb_proxy_test']], 'entries']], { 'name': 'Germany' }]], 'array']]];
    parseQuery(value, value, value, function (result) {
      result[0].should.eql(value);
      result[1].should.eql(value);
      result[2].should.eql(value);
    });
  });

  it('should correctly handle strings with `[]`', function () {
    var value = [1, [51, [[39, [[15, [[14, ['rethinkdb_proxy_test']], 'entries']], { 'name': '[[[[[[[' }]], 'array']]];
    parseQuery(value, value, value, function (result) {
      result[0].should.eql(value);
      result[1].should.eql(value);
      result[2].should.eql(value);
    });
  });
});