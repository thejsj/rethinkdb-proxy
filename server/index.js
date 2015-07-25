/*jshint esnext:true */
const net = require('net');
const BufferParser = require('./buffer-parser');
const protoDef = require('../driver/proto-def');

export default (opts, cb) => {
  let server = net.createServer((c) => { //'connection' listener
    if (server.__connections === undefined) server.__connections = [];
    server.__connections.push(c);

    let parser = new BufferParser();
    opts = Object.assign({
      port: 8125,
      readOnly: false
    }, opts);

    c.connected = false;
    c.clientSocket = net.connect(28015, 'localhost');

    c.clientSocket.on('data', (buff) => {
      if (buff.toString() === 'SUCCESS') c.connected = true;
      // NOTE: The socket might try to write something even if the connection
      // is close
      if (c.destroyed) return;
      c.write(buff);
    });

    parser.on('connect', (version, authKey, protoProtocol) => {
      let versionBuffer = new Buffer(4);
      versionBuffer.writeUInt32LE(version, 0);
      let authBuffer = new Buffer(authKey, 'ascii');
      let authLengthBuffer = new Buffer(4);
      authLengthBuffer.writeUInt32LE(authBuffer.length, 0);
      let protocolBuffer = new Buffer(4);
      protocolBuffer.writeUInt32LE(protoProtocol, 0);
      let token = Buffer.concat([versionBuffer, authLengthBuffer, authBuffer, protocolBuffer]);
      c.clientSocket.write(token);
    });

    parser.on('query', (query, token) => {
      if (opts.readOnly) {
        let insert = new RegExp('\\[' + protoDef.Term.TermType.INSERT, 'i');
        let jsonString = JSON.stringify(query);
        if (jsonString.match(insert)) {
          // This shouldn't throw an error, but rather, it should
          // send the error through the TCP connection
          let tokenBuffer = new Buffer(8);
          tokenBuffer.writeUInt32LE(token & 0xFFFFFFFF, 0);
          tokenBuffer.writeUInt32LE(Math.floor(token / 0xFFFFFFFF), 4);
          let response = {
            t: protoDef.Response.ResponseType.CLIENT_ERROR,
            b: [],
            n: [],
            r: ["Cannot execute write queries"]
          };
          let responseBuffer = new Buffer(JSON.stringify(response));
          let lengthBuffer = new Buffer(4);
          lengthBuffer.writeUInt32LE(responseBuffer.length, 0);
          if (c.destroyed) return;
          c.write(tokenBuffer);
          c.write(lengthBuffer);
          c.write(responseBuffer);
        }
      }
      // Write Token
      let tokenBuffer = new Buffer(8);
      tokenBuffer.writeUInt32LE(token & 0xFFFFFFFF, 0);
      tokenBuffer.writeUInt32LE(Math.floor(token / 0xFFFFFFFF), 4);
      c.clientSocket.write(tokenBuffer);
      let queryBuffer = new Buffer(JSON.stringify(query));
      let lengthBuffer = new Buffer(4);
      lengthBuffer.writeUInt32LE(queryBuffer.length, 0);
      c.clientSocket.write(lengthBuffer);
      c.clientSocket.write(queryBuffer);
    });

    c.on('data', parser.append.bind(parser));
  });

  server.listen(opts.port, cb);

  return {
    'close': () => {
      return new Promise(function (resolve, reject) {
        server.close(resolve);
        setTimeout(function () {
          server.__connections.forEach(function (conn) {
            conn.destroy();
          });
        }, 100);
      });
    }
  };
};

