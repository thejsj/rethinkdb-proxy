/*jshint esnext:true */
var RethinkDBProxy = require('./lib/');
var server = new RethinkDBProxy({});
server.listen();
