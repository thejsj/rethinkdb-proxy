'use strict';

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _Symbol = require('babel-runtime/core-js/symbol')['default'];

var _Object$keys = require('babel-runtime/core-js/object/keys')['default'];

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _bunyan = require('bunyan');

var _bunyan2 = _interopRequireDefault(_bunyan);

var _log_ = _Symbol('log');

var levels = {
  10: 'trace',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal'
};

exports.levels = levels;

var LevelLogger = (function () {
  function LevelLogger(globalLevel, logger) {
    var _this = this;

    _classCallCheck(this, LevelLogger);

    this[_log_] = logger;
    // "fatal" (60): The service/app is going to stop or become unusable now.
    // An operator should definitely look into this soon.
    // "error" (50): Fatal for a particular request, but the service/app continues servicing other requests.
    // An operator should look at this soon(ish).
    // "warn" (40): A note on something that should probably be looked at by an operator eventually.
    // "info" (30): Detail on regular operation.
    // "debug" (20): Anything else, i.e. too verbose to be included in "info" level.
    // "trace" (10): Logging from external libraries used by your app or very detailed application logging.
    _Object$keys(levels).forEach(function (levelKey) {
      _this[levelKey] = _this.log(globalLevel, levelKey, levels[levelKey]);
      _this[levels[levelKey]] = _this.log(globalLevel, levelKey, levels[levelKey]);
    });
  }

  _createClass(LevelLogger, [{
    key: 'log',
    value: function log(globalLevel, level, levelName) {
      var _this2 = this;

      return function () {
        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        _this2[_log_][levelName].apply(_this2[_log_], args);
      };
    }
  }]);

  return LevelLogger;
})();

var Logger = function Logger(inLevel, outLevel, sysLevel) {
  _classCallCheck(this, Logger);

  var logger = _bunyan2['default'].createLogger({ name: 'rethinkdb-proxy' });
  this['in'] = new LevelLogger(inLevel, logger);
  this.out = new LevelLogger(outLevel, logger);
  this.sys = new LevelLogger(sysLevel, logger);
};

exports['default'] = Logger;