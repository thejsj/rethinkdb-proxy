/*jshint esnext:true */
const net = require('net');
const BufferParser = require('./buffer-parser');

const server = net.createServer((c) => { //'connection' listener

  let parser = new BufferParser();

  c.connected = false;
  c.clientSocket = net.connect(28015, 'localhost');

  c.clientSocket.on('data', (buff) => {
    if (buff.toString() === 'SUCCESS') c.connected = true;
    console.log('RETURN', buff.toString());
    c.write(buff);
  });

  parser.on('query', (query, token) => {
    console.log('Query', token);
    console.log(query);
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
    console.log('* Client disconnected *');
  });

  c.on('data', (buff) => {
    if (!c.connected && Buffer.byteLength(buff) === 14) {
      /*!
       * Check if the version number is the same in the client and in the
       * database. This uses the proto-def file to find get the 'magic number'
       *
       * Send a 'SUCCESS' string if succesful.
       */
      console.log('Write to Socket');
      c.clientSocket.write(buff);
      return;
    }
    console.log('Append Query');
    // Parse Query
    parser.append(buff);
  });
});

server.listen(8124, () => { //'listening' listener
  console.log('server bound');
});
