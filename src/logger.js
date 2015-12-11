import bunyan from 'bunyan';

const _log_ = Symbol('log');

export const levels = {
  10: 'trace',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal'
};

class LevelLogger {

  constructor (globalLevel, logger) {
    this[_log_] = logger;
    // "fatal" (60): The service/app is going to stop or become unusable now. 
    // An operator should definitely look into this soon.
    // "error" (50): Fatal for a particular request, but the service/app continues servicing other requests. 
    // An operator should look at this soon(ish).
    // "warn" (40): A note on something that should probably be looked at by an operator eventually.
    // "info" (30): Detail on regular operation.
    // "debug" (20): Anything else, i.e. too verbose to be included in "info" level.
    // "trace" (10): Logging from external libraries used by your app or very detailed application logging.
    Object.keys(levels).forEach(levelKey => {
      this[levelKey] = this.log(globalLevel, levelKey, levels[levelKey]);
      this[levels[levelKey]] = this.log(globalLevel, levelKey, levels[levelKey]);
    });
  }

  log (globalLevel, level, levelName) {
    return (...args) => {
      this[_log_][levelName].apply(this[_log_], args);
    };
  }
}

export default class Logger {

  constructor (inLevel, outLevel, sysLevel) {
    let logger  = bunyan.createLogger({ name: 'rethinkdb-proxy'});
    this.in = new LevelLogger(inLevel, logger);
    this.out = new LevelLogger(outLevel, logger);
    this.sys = new LevelLogger(sysLevel, logger);
  }
}
