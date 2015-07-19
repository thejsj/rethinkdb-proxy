/*jshint esnext:true, node: true */
"use strict";
//let r = require('../driver');
let r = require('rethinkdb');
let net = require('net');

//let socket = net.connect(8124, '127.0.0.1');
//for (let i = 0; i < 10; i += 1) {
  //socket.write(new Buffer('hello-' + i));
//}

r.connect({
  port: 8124
})
 .then(function (conn) {
   r.dbList().run(conn);
   r.dbList().run(conn);
   r.dbList().run(conn);
   return r.dbList()
   .do(function (tableList) {
      return tableList.count();
    })
   .run(conn)
   .then(function (list) {
     console.log('res', list);
     return list;
   })
   .catch(function (err) {
     console.log('Could not get STUFF');
   });
   /*
   .then(function () {
     return r.tableList()
       .run(conn)
       .then(function (list) {
         console.log('res', list);
         return list;
       })
       .catch(function (err) {
         console.log('Could not get STUFF');
       });
   })
   .then(function () {
     return r.tableList()
              .run(conn) .then(function (list) {
         console.log('res', list);
         return list;
       })
       .catch(function (err) {
         console.log('Could not get STUFF');
       });
   });
   */
});
