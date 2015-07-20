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

  c.on('data', (buff) => {
    if (!c.connected && Buffer.byteLength(buff) === 14) {
      /*!
       * Check if the version number is the same in the client and in the
       * database. This uses the proto-def file to find get the 'magic number'
       *
       * Send a 'SUCCESS' string if succesful.
       */
      c.clientSocket.write(buff);
      return;
    }
    // Parse Query
    parser.append(buff);
  });
});

export default (port, cb) => {
  server.listen(port || 8125, cb);
};

