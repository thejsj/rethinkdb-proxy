/*jshint esnext:true */
const net = require('net');
const BufferParser = require('./buffer-parser');

const server = net.createServer((c) => { //'connection' listener

  let parser = new BufferParser();

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

  c.on('end', () => {
    // Do Nothing
  });

  c.on('data', parser.append.bind(parser));
});

export default (port, cb) => {
  server.listen(port || 8125, cb);
};

