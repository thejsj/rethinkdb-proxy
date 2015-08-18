/*jshint esnext:true */
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _listeners_ = Symbol('listeners');
var _queue_ = Symbol('queue');

var BufferParser = (function () {
  function BufferParser() {
    _classCallCheck(this, BufferParser);

    this[_queue_] = new Buffer(0);
    this[_listeners_] = {};
    this.protoVersion = null;
    this.authKeyLength = null;
    this.authKey = null;
    this.protoProtocol = null;
  }

  _createClass(BufferParser, [{
    key: 'append',
    value: function append(buff) {
      if (buff !== undefined) {
        this[_queue_] = Buffer.concat([this[_queue_], buff]);
      }
      if (this.protoVersion === null) {
        if (Buffer.byteLength(this[_queue_]) >= 4) {
          this.protoVersion = this[_queue_].slice(0, 4).readUInt32LE();
          this[_queue_] = this[_queue_].slice(4);
          // Call code again to ensure we don't have the authKey
          this.append();
        }
      } else if (this.authKeyLength === null) {
        if (Buffer.byteLength(this[_queue_]) >= 4) {
          this.authKeyLength = this[_queue_].slice(0, 4).readUInt32LE();
          this[_queue_] = this[_queue_].slice(4);
          // Call code again to ensure we don't have the authKey
          this.append();
        }
      } else if (this.authKey === null) {
        if (Buffer.byteLength(this[_queue_] >= this.authKeyLength)) {
          this.authKey = this[_queue_].slice(0, this.authKeyLength).toString('ascii');
          this[_queue_] = this[_queue_].slice(this.authKeyLength);
          // Call code again to ensure we don't have the authKey
          this.append();
        }
      } else if (this.protoProtocol === null) {
        if (Buffer.byteLength(this[_queue_]) >= 4) {
          this.protoProtocol = this[_queue_].slice(0, 4).readUInt32LE();
          this[_queue_] = this[_queue_].slice(4);
          // Call code again to ensure we don't have the authKey
          this.append();
          this.fireEvent('connect', this.protoVersion, this.authKey, this.protoProtocol);
        }
      } else {
        this.parseQuery();
      }
    }
  }, {
    key: 'fireEvent',
    value: function fireEvent(eventName) {
      for (var _len = arguments.length, data = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        data[_key - 1] = arguments[_key];
      }

      if (this[_listeners_][eventName] !== undefined) {
        this[_listeners_][eventName].forEach(function (func) {
          func.apply(null, data);
        });
      }
    }
  }, {
    key: 'parseQuery',
    value: function parseQuery() {
      /*!
       * Assumptions
       * 1. All clients have their own instance of BufferParser
       * 2. TCP connections send messages in order
       * 3. Because messages are sent in order by the client through a TCP connection,
       * we can assume that all packets are tokens followed by query bytelenghts
       * followed by queries
       */
      var newQueue = null;
      var _prevQuery = null;
      /*!
       * Make sure we have all three components necessary to parse the query:
       * token, byteLength, and query
       */
      if (Buffer.byteLength(this[_queue_]) <= 12) return;
      var token = this[_queue_].slice(0, 8).readUInt32LE();
      var byteLength = this[_queue_].slice(8, 12).readUInt32LE();
      var query = this[_queue_].slice(12, byteLength + 12);
      newQueue = this[_queue_].slice(byteLength + 12);
      try {
        // Simplest way to handle check if input is valid JSON
        var json = JSON.parse(query.toString());
        this.fireEvent('query', json, token);
      } catch (err) {
        // I think the problem has something to do with the fact that I'm adding a
        // comma somehwere ....
        this.fireEvent('error', token);
      }
      this[_queue_] = new Buffer(0);
      if (newQueue !== null && newQueue.length > 0 && Buffer.byteLength(newQueue) >= 8) {
        var _token = newQueue.slice(0, 8).readUInt32LE();
        if (parseInt(_token) === +_token) {
          this.append(newQueue);
        }
      }
    }
  }, {
    key: 'on',
    value: function on(eventName, func) {
      if (this[_listeners_][eventName] === undefined) {
        this[_listeners_][eventName] = [];
      }
      this[_listeners_][eventName].push(func);
    }
  }]);

  return BufferParser;
})();

exports['default'] = BufferParser;
module.exports = exports['default'];