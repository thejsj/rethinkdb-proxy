/*jshint esnext:true, node: true */
"use strict";
let r = require('../driver');

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
