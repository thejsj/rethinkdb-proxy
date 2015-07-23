/*jshint esnext:true */
const net = require('net');
const BufferParser = require('./buffer-parser');

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
        console.log(JSON.stringify(query));
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
        server.__connections.forEach(function (conn) {
          conn.destroy();
        });
      });
    }
  };
};

