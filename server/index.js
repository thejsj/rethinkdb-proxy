/*jshint esnext:true */
const net = require('net');
const BufferParser = require('./buffer-parser');

const server = net.createServer(function(c) { //'connection' listener
  c.connected = false;
  let parser = new BufferParser();
  c.on('end', function() {
    console.log('* Client disconnected *');
  });
  c.on('data', function(buff) {
    if (!c.connected && +(buff.readInt32LE()) === 1074539808) {
      /*!
       * Check if the version number is the same in the client and in the
       * database. This uses the proto-def file to find get the 'magic number'
       *
       * Send a 'SUCCESS' string if succesful.
       */
      var buf = new Buffer(8);
      buf.write('SUCCESS');
      console.log('Connected');
      c.connected = true;
      c.write(buf);
    } else {
      parser.append(buff);
    }
  });
});
server.listen(8124, function() { //'listening' listener
  console.log('server bound');
});
