'use strict';

var _Number$isInteger = require('babel-runtime/core-js/number/is-integer')['default'];

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _rethinkdbProtoDef = require('rethinkdb/proto-def');

var _rethinkdbProtoDef2 = _interopRequireDefault(_rethinkdbProtoDef);

var isRQLQuery = function isRQLQuery(query) {
  // Duck typing a query...
  if (!Array.isArray(query)) return false;
  if (query.length < 2 || query.length > 3) return false;
  if (!_Number$isInteger(query[0])) return false;
  if (query[2] !== undefined && typeof query[2] !== 'object' && !Array.isArray(query[2])) {
    return false;
  }
  return true;
};

var checkForDeleteInReplace = function checkForDeleteInReplace(terms, command, args, query_opts) {
  if (command === _rethinkdbProtoDef2['default'].Term.TermType.REPLACE && !terms.includes('REPLACE') && terms.includes('DELETE')) {
    var argPassedToReplace = args[args.length - 1];
    if (argPassedToReplace === null) {
      return [{
        'error': 'Using the `REPLACE` term with `null` is not allowed if `DELETE` is not also allowed.'
      }];
    }
  }
  return [];
};

var checkForUpdateInInsert = function checkForUpdateInInsert(terms, command, args, query_opts) {
  if (command === _rethinkdbProtoDef2['default'].Term.TermType.INSERT && !terms.includes('INSERT') && terms.includes('UPDATE')) {
    if (typeof query_opts === 'object' && typeof query_opts.conflict === 'string' && query_opts.conflict.toLowerCase() === 'update') {
      return [{
        'error': 'Using the `INSERT` term with `conflict: update` is not allowed if `UPDATE` is not also allowed.'
      }];
    }
  }
  return [];
};

var checkForDeleteInInsert = function checkForDeleteInInsert(terms, command, args, query_opts) {
  if (command === _rethinkdbProtoDef2['default'].Term.TermType.INSERT && !terms.includes('INSERT') && terms.includes('REPLACE')) {
    if (typeof query_opts === 'object' && typeof query_opts.conflict === 'string' && query_opts.conflict.toLowerCase() === 'replace') {
      return [{
        'error': 'Using the `INSERT` term with `conflict: replace` is not allowed if `REPLACE` is not also allowed.'
      }];
    }
  }
  return [];
};

var checkForTableAccess = function checkForTableAccess(opts, connectionDbName, command, args, query_opts) {
  if (command === _rethinkdbProtoDef2['default'].Term.TermType.TABLE && typeof opts === 'object') {
    var tableName = args[args.length - 1];
    var dbName = connectionDbName;
    /*!
     * Since the name of a table can be passed dynamically and this introducues
     * a lot of complexity to determining whether a tables is allowed, only
     * allow strings, which cover most cases
     */
    if (typeof tableName !== 'string') {
      return [{
        'error': 'Only strings are allowed for table names while using the `table` command'
      }];
    }
    if (opts.dbs.$$count > 0 && (typeof opts.dbs[dbName] === 'object' && opts.dbs[dbName].allowed)) {
      if (opts.dbs[dbName].$$count > 0 && (typeof opts.dbs[dbName].tables[tableName] !== 'object' || !opts.dbs[dbName].tables[tableName].allowed)) {
        return [{ 'error': 'Access to the `{$tableName}` table is not allowed.' + ' Table must be declared in the `tables` and' + ' database must be inlcluded in `dbs` parameter'
        }];
      }
    }
  }
  return [];
};

var checkForDatabaseAccess = function checkForDatabaseAccess(opts, connectionDbName, command, args, query_opts) {
  if (command === _rethinkdbProtoDef2['default'].Term.TermType.DB && typeof opts === 'object') {
    var dbName = args[args.length - 1];
    /*!
     * Since the name of a database can be passed dynamically and this introduces
     * a lot of complexity to determining whether a tables is allowed, only
     * allow strings, which cover most cases
     */
    if (typeof dbName !== 'string') {
      return [{
        'error': 'Only strings are allowed for database names while using the `db` command'
      }];
    }
    if (!opts.allowSysDbAccess && dbName === 'rethinkdb') {
      return [{
        'error': 'Access to the `rethinkdb` database is not allowed unless explicitly stated with `allowSysDbAccess`'
      }];
    }
    if (opts.dbs.$$count > 0 && (typeof opts.dbs[dbName] !== 'object' || !opts.dbs[dbName].allowed)) {
      return [{ 'error': 'Access to the `' + dbName + '` database is not allowed. ' + 'Database must be inlcluded in `db` parameter' }];
    }
  }
  return [];
};

var findTermsOrErrors = function findTermsOrErrors(opts, terms, query) {
  var termsFound = [],
      connectionDbName = undefined;

  var __findTermsOrErrors = function __findTermsOrErrors(query) {
    if (!isRQLQuery(query)) {
      if (Array.isArray(query)) {
        return _lodash2['default'].flatten(query.map(__findTermsOrErrors)).filter(function (x) {
          return x;
        });
      }
      return [];
    }
    var command = query[0],
        args = query[1],
        query_opts = query[2];

    /*!
     * Edge cases
     */
    var errorsFound = []
    // #1 If `replace` is allowed but `delete` is not
    .concat(checkForDeleteInReplace(terms, command, args, query_opts))
    // #2 If `insert` is allowed but `update` is not
    .concat(checkForUpdateInInsert(terms, command, args, query_opts))
    // #3 If `insert` is allowed but `delete` is not
    .concat(checkForDeleteInInsert(terms, command, args, query_opts));
    if (errorsFound.length > 0) return errorsFound;

    /*!
     * Database and table access
     */
    errorsFound = [].concat(checkForDatabaseAccess(opts, connectionDbName, command, args, query_opts)).concat(checkForTableAccess(opts, connectionDbName, command, args, query_opts));
    if (errorsFound.length > 0) return errorsFound;

    /*!
     * Check for unallowedTerms
     */
    for (var key in terms) {
      if (terms.hasOwnProperty(key)) {
        var termName = terms[key];
        if (_rethinkdbProtoDef2['default'].Term.TermType[termName] === command) return termName;
      }
    }
    if (command === _rethinkdbProtoDef2['default'].Term.TermType.MAKE_ARRAY) {
      return _lodash2['default'].flatten(query[1].map(__findTermsOrErrors)).filter(function (x) {
        return x;
      });
    }
    return _lodash2['default'].flatten(query.map(__findTermsOrErrors)).filter(function (x) {
      return x;
    });
  };

  if (typeof query[2] === 'object' && query[2].db !== undefined) {
    connectionDbName = query[2].db[1][0];
    termsFound = termsFound.concat(__findTermsOrErrors(query[2].db));
  }
  return termsFound.concat(__findTermsOrErrors(query));
};
exports.findTermsOrErrors = findTermsOrErrors;