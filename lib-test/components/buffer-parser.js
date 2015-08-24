'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
var BufferParser;
if (process.env.NODE_ENV === 'test_es6') {
  // Called from /test
  var BufferParserES6 = require('../../src/buffer-parser');
  BufferParser = BufferParserES6;
} else {
  // Called from /lib/test
  var BufferParserES5 = require('../../lib/buffer-parser');
  BufferParser = BufferParserES5;
}
exports['default'] = BufferParser;
module.exports = exports['default'];