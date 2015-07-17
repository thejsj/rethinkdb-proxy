var net = require('net');
var server = net.createServer(function(c) { //'connection' listener
  c.connected = false;
  var queries = {};
  var lastQueryToken = null;
  c.on('end', function() {
    console.log('* Client disconnected *');
  });
  c.on('data', function(data) {
    console.log('-- * --');
    if (!c.connected && +(data.readInt32LE()) === 1074539808) {
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
    } else if (true) {
      console.log(data.toString().split());
      if (Buffer.byteLength(data) > 10) {
        c.write({
          t: 1,
          p: 'foo'
        });
      }
    }
    console.log('  Byte Length:', Buffer.byteLength(data));
  });
});
server.listen(8124, function() { //'listening' listener
  console.log('server bound');
});
