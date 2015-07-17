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
      c.write(buf, function () {
        c.connected = true;
      });
    } else if (true) {
      if (Buffer.byteLength(data) === 8) {
        console.log('1. Query Token', Buffer.byteLength(data), data.readUInt32LE());
        // Add query token to our queries
        queries[data.readUInt32LE()] = {
          token: data
        };
        lastQueryToken = data.readUInt32LE();
      } else if (Buffer.byteLength(data) === 4) {
        console.log('2. TokenId');
        console.log(Buffer.byteLength(data));
        queries[lastQueryToken].length = data.readUInt32LE();
      } else {
        console.log('3. Query', Buffer.byteLength(data));
        //var bufferLength = Buffer.byteLength(data);
        //if (bufferLength === queries[lastQueryToken].length) {
          var str = data.toString('utf8');
          console.log('str', str);
          //console.log(JSON.parse(str));
          //c.write(new Buffer(JSON.stringify({
            //t: 1,
            //r: ['foo']
          //})));
        //}
      }
      /*!
       * After the initial connection, we'll get a buffer with some stuff
       * that we need to save
       */
    } else {
      // All queries have a token/signature/SOMETHING at the beginning of the query
      var query = data.toString().trim();
      console.log('This is a query');
      //console.log(query.split(''));
      var buff = new Buffer([ 'a', 'b', 'c' ]);
      //c.write(buff);
    }
    console.log('  Byte Length:', Buffer.byteLength(data));
  });
});
server.listen(8124, function() { //'listening' listener
  console.log('server bound');
});
