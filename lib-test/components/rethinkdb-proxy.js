'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
var RethinkDBProxy;
if (process.env.NODE_ENV === 'test_es6') {
  // Called from /test
  var RethinkDBProxyES6 = require('../../src');
  RethinkDBProxy = RethinkDBProxyES6;
} else {
  // Called from /lib/test
  var RethinkDBProxyES5 = require('../../lib');
  RethinkDBProxy = RethinkDBProxyES5;
}
exports['default'] = RethinkDBProxy;
module.exports = exports['default'];