import _ from 'lodash';
import protoDef from 'rethinkdb/proto-def';

let isRQLQuery = (query) => {
  // Duck typing a query...
  if (!Array.isArray(query)) return false;
  if (query.length < 2 || query.length > 3) return false;
  if (!Number.isInteger(query[0])) return false;
  if (query[2] !== undefined && typeof query[2] !== 'object' && !Array.isArray(query[2])) {
    return false;
  }
  return true;
};

let checkForDeleteInReplace = function (terms, command, args, query_opts) {
  if (
    command === protoDef.Term.TermType.REPLACE &&
    !terms.includes('REPLACE') &&
    terms.includes('DELETE')
  ){
    let argPassedToReplace = args[args.length - 1];
    if (argPassedToReplace === null) {
      return [{
        'error': 'Using the `REPLACE` term with `null` is not allowed if `DELETE` is not also allowed.'
      }];
    }
  }
  return [];
};

let checkForUpdateInInsert = function (terms, command, args, query_opts) {
 if (
    command === protoDef.Term.TermType.INSERT &&
    !terms.includes('INSERT') &&
    terms.includes('UPDATE')
  ){
    if (
      typeof query_opts === 'object' &&
      typeof query_opts.conflict === 'string' &&
      query_opts.conflict.toLowerCase() === 'update'
    ) {
      return [{
        'error': 'Using the `INSERT` term with `conflict: update` is not allowed if `UPDATE` is not also allowed.'
      }];
    }
  }
  return [];
};

let checkForDeleteInInsert = function (terms, command, args, query_opts) {
 if (
    command === protoDef.Term.TermType.INSERT &&
    !terms.includes('INSERT') &&
    terms.includes('REPLACE')
  ){
    if (
      typeof query_opts === 'object' &&
      typeof query_opts.conflict === 'string' &&
      query_opts.conflict.toLowerCase() === 'replace'
    ) {
      return [{
        'error': 'Using the `INSERT` term with `conflict: replace` is not allowed if `REPLACE` is not also allowed.'
      }];
    }
  }
  return [];
};

let checkForTableAccess =  function (opts, connectionDbName, command, args, query_opts) {
  if (command === protoDef.Term.TermType.TABLE && typeof opts === 'object') {
    let tableName = args[args.length - 1];
    let dbName = connectionDbName;
    console.log('tableName', tableName, dbName);
    console.log(command, args, query_opts);
    if (opts.dbs.$$count > 0 && (typeof opts.dbs[dbName] !== 'object' || !opts.dbs[dbName].allowed)) {
      if (
          opts.dbs[dbName].tables[tableName].$$count > 0 &&
          (typeof opts.dbs[dbName].tables[tableName] !== 'object' ||
          opts.dbs[dbName].tables[tableName].allowed)
      ) {
        return { 'error': `Access to the \`{$dbName}\` database is not allowed.
          //Database must be inlcluded in \`db\` parameter` };
      }
    }
  }
  return [];
};

let checkForDatabaseAccess =  function (opts, connectionDbName, command, args, query_opts) {
  if (command === protoDef.Term.TermType.DB && typeof opts === 'object') {
    let dbName = args[args.length - 1];
    if (!opts.allowSysDbAccess && dbName === 'rethinkdb') {
      return [{
        'error': 'Access to the `rethinkdb` database is not allowed unless explicitly stated with `allowSysDbAccess`'
      }];
    }
    if (opts.dbs.$$count > 0 && (typeof opts.dbs[dbName] !== 'object' || !opts.dbs[dbName].allowed)) {
      return [{ 'error': `Access to the \`${dbName}\` database is not allowed. ` +
        `Database must be inlcluded in \`db\` parameter` }];
    }
  }
  return [];
};

export const findTerms = (opts, terms, query) => {
  let termsFound = [], connectionDbName;

  const __findTerms = (query) => {
    if (!isRQLQuery(query)) {
      if (Array.isArray(query)) {
        return _.flatten(query.map(__findTerms)).filter(x => x);
      }
      return [];
    }
    let command = query[0], args = query[1], query_opts = query[2];

    /*!
     * Edge cases
     */
    let errorsFound = []
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
    errorsFound = []
      .concat(checkForDatabaseAccess(opts, connectionDbName, command, args, query_opts))
      .concat(checkForTableAccess(opts, connectionDbName, command, args, query_opts));
    if (errorsFound.length > 0) return errorsFound;

    /*!
     * Check for unallowedTerms
     */
    for (let termName of terms.values()) {
      if(protoDef.Term.TermType[termName] === command) return termName;
    }
    if (command === protoDef.Term.TermType.MAKE_ARRAY) {
      return _.flatten(query[1].map(__findTerms)).filter(x => x);
    }
    return _.flatten(query.map(__findTerms)).filter(x => x);
  };

  if (typeof query[2] === 'object' && query[2].db !== undefined) {
    connectionDbName = query[2].db[1][0];
    termsFound = termsFound.concat(__findTerms(query[2].db));
  }
  return termsFound.concat(__findTerms(query));
};


