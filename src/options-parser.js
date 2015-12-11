import taser from 'taser';
import { levels } from './logger.js';

const assertStringOrArray = taser(['string', 'array']);
const assertBoolean = taser(['boolean']);
const assertNumber = taser(['number']);
const assertString = taser(['string']);
const assertLevelString = taser({
  type: 'string',
  values: (() => {
    return Object.keys(levels).map(levelKey => levels[levelKey]);
  })()
});

let getAllowedTermsOpts = (opts) => {
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

let getAllowedDatabaseOpts = (opts) => {
  // Clean options
  if (typeof opts.dbs === 'string') opts.dbs = [opts.dbs];
  if (typeof opts.tables === 'string') opts.tables = [opts.tables];

  // Create object for dbs
  let databases = opts.dbs;
  opts.dbs = {
    $$count: 0 // `$` not allowed in RethinkDB database names
  };
  databases.forEach(function (database) {
    opts.dbs[database] = { allowed: true, tables: { }, $$count: 0 };
    // `$` not allowed in RethinkDB database names
    opts.dbs.$$count += 1;
  });
  opts.tables.forEach(function (tableName) {
    if (opts.dbs.$$count > 1) {
      let split = tableName.split('.');
      if (split.length !== 2) {
        let message = `If more than 1 database is passed, `;
        message += `all table names must be dot (\`.\`) separated with the table names.`;
        message += ` \`${tableName}\` is not valid.`;
        throw new Error(message);
      }
      if (opts.dbs[split[0]] === undefined) {
        let message = `Database ${split[0]} in ${tableName} was not declared`;
        throw new Error(message);
      }
      opts.dbs[split[0]].tables[split[1]] = { allowed: true };
      opts.dbs[split[0]].$$count += 1;
    }
  });
  return opts;
};

let parseLoggingOpts = (opts) => {
  // Set default levels
  if (opts.logLevel === undefined) opts.logLevel = 'fatal';
  if (opts.logLevelIn === undefined) opts.logLevelIn = opts.logLevel;
  if (opts.logLevelOut === undefined) opts.logLevelOut = opts.logLevel;
  if (opts.logLevelSys === undefined) opts.logLevelSys = opts.logLevel;
  let levelsStringToInts = Object.keys(levels).reduce((keysObj, key) => {
    let obj = {};
    obj[levels[key]] = key;
    return Object.assign(keysObj, obj);
  }, {});
  opts.logLevel = levelsStringToInts[opts.logLevel];
  opts.logLevelIn = levelsStringToInts[opts.logLevelIn];
  opts.logLevelOut = levelsStringToInts[opts.logLevelOut];
  opts.logLevelSys = levelsStringToInts[opts.logLevelSys];
  return opts;
};

export default (opts) => {
  // Define Options and defaults
  opts = Object.assign({
    port: 8125,
    rdbHost: 'localhost',
    rdbPort: 28015,
    logLevel: 'fatal',
    logLevelIn: 'fatal',
    logLevelOut: 'fatal',
    logLevelSys: 'fatal',
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
  assertLevelString(opts.logLevel);
  assertLevelString(opts.logLevelIn);
  assertLevelString(opts.logLevelOut);
  assertLevelString(opts.logLevelSys);
  assertStringOrArray(opts.dbs);
  assertStringOrArray(opts.tables);

  // Assert booleans
  for (let key in opts) {
    if (opts.hasOwnProperty(key) && key.substring(0, 5) === 'allow') {
      assertBoolean(opts[key]);
    }
  }

  // Parse logging options
  opts = parseLoggingOpts(opts);

  // Get allowed databases
  opts = getAllowedDatabaseOpts(opts);

  // Get allowed terms
  opts = getAllowedTermsOpts(opts);

  return opts;
};
