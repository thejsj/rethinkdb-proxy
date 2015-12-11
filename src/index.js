/*jshint esnext:true, bitwise:false */
import 'babel/polyfill';
import net from 'net';
import protoDef from 'rethinkdb/proto-def';
import BufferParser from './buffer-parser';
import { findTermsOrErrors } from './query-parser';
import optionsParser from './options-parser';
import Logger from './logger.js';

export default class RethinkDBProxy {

  constructor (opts) {
    // Set defaults and unallowedTerms
    this.opts = optionsParser(opts);
    this.logger = new Logger(opts.inLevel, opts.outLevel, opts.sysLevel);
    this.__connections = [];
    this.server = net.createServer(this.connectionHandler.bind(this));
    return this;
  }

  listen (cb) {
    return new Promise((resolve, reject) => {
      this.server.listen(this.opts.port, (err) => {
        if (err) {
          this.logger.sys.info({ err: err, port: this.opts.port }, 'Error tryingg to listen for traffic');
          if (typeof cb === 'function') cb(err);
          reject(err);
        }
        this.logger.sys.info({ port: this.opts.port }, 'server.listen');
        if (typeof cb === 'function') cb();
        resolve();
      });
    });
  }

  close (cb) {
    return new Promise((resolve, reject) => {
      this.server.close(() => {
        this.logger.sys.info('server.close');
        if (typeof cb === 'function') cb();
        resolve();
      });
      setTimeout(() => {
        this.logger.sys.info('Server closing all connections');
        this.__connections.forEach((conn) => {
          this.logger.sys.trace({ conn: conn }, 'conn.destroy');
          conn.destroy();
        });
      }, 100);
    });
  }

  makeSendResponse (socket) {
    return (response, token) => {
      this.logger.out.info({
        token: token,
        response: response
      }, 'Send Response');
      let tokenBuffer = new Buffer(8);
      tokenBuffer.writeUInt32LE(token & 0xFFFFFFFF, 0);
      tokenBuffer.writeUInt32LE(Math.floor(token / 0xFFFFFFFF), 4);
      let responseBuffer = new Buffer(JSON.stringify(response));
      let lengthBuffer = new Buffer(4);
      lengthBuffer.writeUInt32LE(responseBuffer.length, 0);
      if (socket.destroyed) return;
      socket.write(tokenBuffer);
      socket.write(lengthBuffer);
      socket.write(responseBuffer);
    };
  }

  makeSendError (clientSocket) {
    let sendResponseToClient = this.makeSendResponse(clientSocket);
    return (token, message) => {
      let response = {
        t: protoDef.Response.ResponseType.CLIENT_ERROR,
        b: [],
        n: [],
        r: [message]
      };
      this.logger.out.info({
        message: message,
        response: response,
        token: token
      }, 'Send Error');
      sendResponseToClient(response, token);
    };
  }

  connectionHandler (clientSocket) {

    this.__connections.push(clientSocket);

    clientSocket.connected = false;
    let parser = new BufferParser();
    let serverSocket = net.connect(this.opts.rdbPort, this.opts.rdbHost);
    let sendResponseToServer = this.makeSendResponse(serverSocket);
    let sendResponseToClient = this.makeSendResponse(clientSocket);
    let sendError = this.makeSendError(clientSocket);

    /*!
     * Listeners
     */
    serverSocket.on('data', (buff) => {
      this.logger.out.info({
        buffer: buff.toString(),
      }, 'Data received');
      if (buff.toString() === 'SUCCESS') clientSocket.connected = true;
      // NOTE: The socket might try to write something even if the connection
      // is closed
      if (clientSocket.destroyed) return;
      clientSocket.write(buff);
    });

    parser.on('connect', (version, authKey, protoProtocol) => {
      this.logger.in.info({
        version: version,
        authKey: authKey,
        protoProtocol: protoProtocol
      }, 'parser.on.connect');
      let versionBuffer = new Buffer(4);
      versionBuffer.writeUInt32LE(version, 0);
      let authBuffer = new Buffer(authKey, 'ascii');
      let authLengthBuffer = new Buffer(4);
      authLengthBuffer.writeUInt32LE(authBuffer.length, 0);
      let protocolBuffer = new Buffer(4);
      protocolBuffer.writeUInt32LE(protoProtocol, 0);
      let token = Buffer.concat([versionBuffer, authLengthBuffer, authBuffer, protocolBuffer]);
      if (protoProtocol !== protoDef.VersionDummy.Protocol.JSON) {
        sendError(token, 'Proxy Error: Only JSON protocol allowed.');
      }
      serverSocket.write(token);
    });

    parser.on('error', (token) => {
      this.logger.in.error({
        token: token,
      }, 'parser.on.error');
      sendError('Proxy Error: Could not parse query correctly.');
    });

    parser.on('query', (query, token) => {
      this.logger.in.info({
        query: query,
        token: token,
      }, 'parser.on.query');
      let termsFound = findTermsOrErrors(this.opts, this.opts.unallowedTerms, query);
      if (termsFound.length > 0) {
        // This shouldn't throw an error. It should
        // send the error through the TCP connection
        let errorMessage;
        if (typeof termsFound[0] === 'object' && typeof termsFound[0].error === 'string') {
          errorMessage = termsFound[0].error;
        } else {
          errorMessage = 'Cannot execute query. \"' + termsFound + '\" query not allowed.';
        }
        this.logger.in.warn({
          termsFound: termsFound,
          errorMessage: errorMessage,
        }, 'parser.on.query Error');
        sendError(token, errorMessage);
      }
      return sendResponseToServer(query, token);
    });

    clientSocket.on('data', (data) => {
      this.logger.in.trace({
        data: data,
      }, 'clientSocket.on.data');
      return parser.append(data);
    });
  }
}

