export default (opts) => {
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

  // Clean options
  if (typeof opts.dbs === 'string') {
    opts.dbs = [opts.dbs];
  }
  // Create object for dbs
  let databases = opts.dbs;
  opts.dbs = {
    $$count: 0 // `$` not allowed in RethinkDB database names
  };
  databases.forEach(function (database) {
    opts.dbs[database] = { allowed: true };
    // `$` not allowed in RethinkDB database names
    opts.dbs.$$count += 1;
  });

  // By default, don't allow any of these terms
  opts.unallowedTerms = [
    'INSERT',
    'UPDATE',
    'REPLACE',
    'DELETE',
    'DB_CREATE',
    'DB_DROP',
    'TABLE_CREATE',
    'TABLE_DROP',
    'INDEX_CREATE',
    'INDEX_DROP',
    'INDEX_RENAME',
    'RECONFIGURE',
    'REBALANCE',
    'HTTP',
    'JAVASCRIPT'
  ];

  let toUpperCaseSnakeCase = (str) => {
    return str
      .replace(/(^[A-Z])/g, ($1) => { return $1.toLowerCase(); })
      .replace(/([A-Z])/g, ($1) => { return '_'+$1.toUpperCase(); })
      .toUpperCase();
  };
  let allowTerm = (termName) => {
    if (opts.unallowedTerms.includes(termName)) {
      opts.unallowedTerms.splice(opts.unallowedTerms.indexOf(termName), 1);
    }
  };
  // Allow all terms specified by user (single terms)
  for(let key in opts) {
    if (opts.hasOwnProperty(key)) {
      if (opts[key] === true && key.substring(0, 5) === 'allow') {
        let termName = toUpperCaseSnakeCase(key.substring(5));
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
