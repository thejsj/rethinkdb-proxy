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
      return { 'error': 'Using the `REPLACE` term with `null` is not allowed if `DELETE` is not also allowed.' };
    }
  }
  return null;
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
      return {
        'error': 'Using the `INSERT` term with `conflict: update` is not allowed if `UPDATE` is not also allowed.'
      };
    }
  }
  return null;
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
      return {
        'error': 'Using the `INSERT` term with `conflict: replace` is not allowed if `REPLACE` is not also allowed.'
      };
    }
  }
  return null;
};

let checkForTableAccess =  function (opts, command, args, query_opts) {
  if (command === protoDef.Term.TermType.TABLE && typeof opts === 'object') {
    let tableName = args[args.length - 1];
    //console.log('tableName', tableName);
    //console.log(command, args, query_opts);
    //if (Array.isArray(opts.db) && opts.db.length > 0 && !opts.db.includes(dbName)) {
      //return { 'error': `Access to the \`{$dbName}\` database is not allowed.
        //Database must be inlcluded in \`db\` parameter` };
    //}
  }
  return null;
};

let checkForDatabaseAccess =  function (opts, command, args, query_opts) {
  if (command === protoDef.Term.TermType.DB && typeof opts === 'object') {
    let dbName = args[args.length - 1];
    if (!opts.allowSysDbAccess && dbName === 'rethinkdb') {
      return {
        'error': 'Access to the `rethinkdb` database is not allowed unless explicitly stated with `allowSysDbAccess`'
      };
    }
    if (Array.isArray(opts.db) && opts.db.length > 0 && !opts.db.includes(dbName)) {
      return { 'error': `Access to the \`{$dbName}\` database is not allowed.
        Database must be inlcluded in \`db\` parameter` };
    }
  }
  return null;
};

export const findTerms = (opts, terms, query) => {

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
    let found = null;
    // #1 If `replace` is allowed but `delete` is not
    found = found || checkForDeleteInReplace(terms, command, args, query_opts);
    // #2 If `insert` is allowed but `update` is not
    found = found || checkForUpdateInInsert(terms, command, args, query_opts);
    // #3 If `insert` is allowed but `delete` is not
    found = found || checkForDeleteInInsert(terms, command, args, query_opts);
    if (found !== null) return found;

     /*!
     * Database and table access
     */
    found = found || checkForDatabaseAccess(opts, command, args, query_opts);
    found = found || checkForTableAccess(opts, command, args, query_opts);
    if (found !== null) return found;

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
  return __findTerms(query);
};


