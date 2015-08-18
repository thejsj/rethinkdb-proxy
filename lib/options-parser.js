'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _taser = require('taser');

var _taser2 = _interopRequireDefault(_taser);

var assertStringOrArray = (0, _taser2['default'])(['string', 'array']);
var assertBoolean = (0, _taser2['default'])(['boolean']);
var assertNumber = (0, _taser2['default'])(['number']);
var assertString = (0, _taser2['default'])(['string']);

exports['default'] = function (opts) {
  // Define Options and defaults
  opts = Object.assign({
    port: 8125,
    rdbHost: 'localhost',
    rdbPort: 28015,
    dbs: [],
    tables: [],
    allowSysDbAccess: false,
    allowWrites: false, // Allow insert, update, delete
    allowInsert: false,
    allowUpdate: false,
    allowReplace: false,
    allowDelete: false,
    allowDbCreate: false,
    allowDbDrop: false,
    allowTableCreate: false,
    allowTableDrop: false,
    allowIndexes: false, // Allow indexCreate, indexDrop, indexRename
    allowIndexCreate: false,
    allowIndexDrop: false,
    allowIndexRename: false,
    allowReconfigure: false,
    allowRebalance: false,
    allowHttp: false,
    allowJavascript: false
  }, opts);

  // Ensure validity of inputs
  assertNumber(opts.port);
  assertNumber(opts.rdbPort);
  assertString(opts.rdbHost);
  assertStringOrArray(opts.dbs);
  assertStringOrArray(opts.tables);
  for (var key in opts) {
    if (opts.hasOwnProperty(key) && key.substring(0, 5) === 'allow') {
      assertBoolean(opts[key]);
    }
  }

  // Clean options
  if (typeof opts.dbs === 'string') opts.dbs = [opts.dbs];
  if (typeof opts.tables === 'string') opts.tables = [opts.tables];

  // Create object for dbs
  var databases = opts.dbs;
  opts.dbs = {
    $$count: 0 // `$` not allowed in RethinkDB database names
  };
  databases.forEach(function (database) {
    opts.dbs[database] = { allowed: true, tables: {}, $$count: 0 };
    // `$` not allowed in RethinkDB database names
    opts.dbs.$$count += 1;
  });
  opts.tables.forEach(function (tableName) {
    if (opts.dbs.$$count > 1) {
      var split = tableName.split('.');
      if (split.length !== 2) {
        var message = 'If more than 1 database is passed, ';
        message += 'all table names must be dot (`.`) separated with the table names.';
        message += ' `' + tableName + '` is not valid.';
        throw new Error(message);
      }
      if (opts.dbs[split[0]] === undefined) {
        var message = 'Database ' + split[0] + ' in ' + tableName + ' was not declared';
        throw new Error(message);
      }
      opts.dbs[split[0]].tables[split[1]] = { allowed: true };
      opts.dbs[split[0]].$$count += 1;
    }
  });

  // By default, don't allow any of these terms
  opts.unallowedTerms = ['INSERT', 'UPDATE', 'REPLACE', 'DELETE', 'DB_CREATE', 'DB_DROP', 'TABLE_CREATE', 'TABLE_DROP', 'INDEX_CREATE', 'INDEX_DROP', 'INDEX_RENAME', 'RECONFIGURE', 'REBALANCE', 'HTTP', 'JAVASCRIPT'];

  var toUpperCaseSnakeCase = function toUpperCaseSnakeCase(str) {
    return str.replace(/(^[A-Z])/g, function ($1) {
      return $1.toLowerCase();
    }).replace(/([A-Z])/g, function ($1) {
      return '_' + $1.toUpperCase();
    }).toUpperCase();
  };
  var allowTerm = function allowTerm(termName) {
    if (opts.unallowedTerms.includes(termName)) {
      opts.unallowedTerms.splice(opts.unallowedTerms.indexOf(termName), 1);
    }
  };
  // Allow all terms specified by user (single terms)
  for (var key in opts) {
    if (opts.hasOwnProperty(key)) {
      if (opts[key] === true && key.substring(0, 5) === 'allow') {
        var termName = toUpperCaseSnakeCase(key.substring(5));
        allowTerm(termName);
      }
    }
  }
  // Allow all terms specified (multiple terms)
  if (opts.allowWrites) {
    allowTerm('INSERT');
    allowTerm('UPDATE');
    allowTerm('DELETE');
  }
  if (opts.allowIndexes) {
    allowTerm('INDEX_CREATE');
    allowTerm('INDEX_DROP');
    allowTerm('INDEX_RENAME');
  }
  return opts;
};

module.exports = exports['default'];