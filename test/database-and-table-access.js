/*jshint esnext:true */
import r from 'rethinkdb';
import Promise from 'bluebird';
import RethinkDBProxy from '../src';
import should from 'should';
import { makeExecuteQuery, makeExecuteProxyQuery, makeAssertQuery, makeCreateDatabase, makeDropDatabase } from './utils';
import protoDef from '../node_modules/rethinkdb/proto-def';

let proxyPort = 8125;
let dbName = 'rethinkdb_proxy_test';
let secondDbName = 'rethinkdb_proxy_test_2';
let tableName = 'entries';
let server;

let executeQuery = makeExecuteQuery(dbName, proxyPort);
let executeProxyQuery = makeExecuteProxyQuery(dbName, proxyPort);
let assertQuery = makeAssertQuery(executeQuery);
let createDatabase = makeCreateDatabase(dbName, tableName);
let createSecondDatabase = makeCreateDatabase(secondDbName, tableName);
let dropDatabase = makeDropDatabase(dbName);
let throwError = function (res) { throw new Error(); };
let expectError = function (errorName, errorMessageMatch, err) {
  if (errorName !== null) errorName.should.equal(err.name);
  if (errorMessageMatch !== null) err.msg.should.match(errorMessageMatch);
  (err instanceof Error).should.equal(true);
};

describe('Database and Table Access', () => {

  let get = r.db(dbName).table(tableName);

  describe('allowSysDbAccess', () => {

    describe('Disallow RethinkDB Database Access', () => {

      before(function (done) {
        this.timeout(5000);
        createDatabase()
          .then(() => {
            return new Promise(function (resolve, reject) {
              server = new RethinkDBProxy({
                port: proxyPort,
              });
              server.listen(resolve);
            });
          })
          .nodeify(done);
      });

      after((done) => {
        dropDatabase()
        .then(server.close.bind(server))
        .then(done.bind(null, null));
      });

     it('should not allow a query that uses the `rethinkdb` database', (done) => {
       executeQuery(r.db('rethinkdb').tableList())
        .then(throwError, expectError.bind(null, 'ReqlDriverError', /DATABASE/i))
        .nodeify(done);
     });

     it('should not allow a query that uses the `rethinkdb` database inside a `do`', (done) => {
       executeQuery(r.expr(true).do(function () {
         return r.db('rethinkdb').tableList();
       }))
        .then(throwError, expectError.bind(null, 'ReqlDriverError', /DATABASE/i))
        .nodeify(done);
     });

     it('should not allow a query that uses the `rethinkdb` database inside a `do` inside a `do`', (done) => {
       executeQuery(r.expr([1, 2, 3]).do(function (arr) {
         return r.expr(arr).do(function () {
           return r.db('rethinkdb').tableList();
         });
       }))
        .then(throwError, expectError.bind(null, 'ReqlDriverError', /DATABASE/i))
        .nodeify(done);
     });

     it('should not allow a query that passes null to `replace` if `delete` is not allowed', (done) => {
        executeQuery(r.db('rethinkdb').table('server_config'))
          .then(throwError, expectError.bind(null, 'ReqlDriverError', /DATABASE/i))
          .nodeify(done);
      });

    });

    describe('Allow RethinkDB Database Access', () => {

      before(function (done) {
        this.timeout(5000);
        createDatabase()
          .then(() => {
            return new Promise(function (resolve, reject) {
              server = new RethinkDBProxy({
                port: proxyPort,
                allowSysDbAccess: true
              });
              server.listen(resolve);
            });
          })
          .nodeify(done);
      });

      after((done) => {
        dropDatabase()
        .then(server.close.bind(server))
        .then(done.bind(null, null));
      });

     it('should allow a query that uses the `rethinkdb` database, if explicitly set', (done) => {
        executeQuery(r.db('rethinkdb').tableList())
          .then(function (res) {
            Array.isArray(res).should.equal(true);
            res.length.should.not.be.equal(0);
          })
          .nodeify(done);
      });

     it('should allow a query queries the `rehtinkdb` database if explicitly set', (done) => {
        executeQuery(r.db('rethinkdb').table('server_config').coerceTo('array'))
          .then(function (res) {
            Array.isArray(res).should.equal(true);
            res.length.should.not.be.equal(0);
          })
          .nodeify(done);
      });
    });

  });

  describe('Database Access', () => {
    before(function (done) {
      this.timeout(5000);
      createDatabase()
        .then(createSecondDatabase)
        .then(() => {
          return new Promise(function (resolve, reject) {
            server = new RethinkDBProxy({
              port: proxyPort,
              dbs: [dbName, 'someOtherDb'],
            });
            server.listen(resolve);
          });
        })
        .nodeify(done);
    });

    after((done) => {
      dropDatabase()
      .then(server.close.bind(server))
      .then(done.bind(null, null));
    });


    it('should not allow access to a database that was not allowed', (done) => {
      executeProxyQuery(r.db(secondDbName).tableList())
        .then(throwError, expectError.bind(null, 'ReqlDriverError', /DATABASE/i))
        .nodeify(done);
    });

    it('should not allow access to a database that was not allowed inside a `do`', (done) => {
      executeProxyQuery(r.expr(1).do(function () {
        return r.db(secondDbName).tableList();
      }))
        .then(throwError, expectError.bind(null, 'ReqlDriverError', /DATABASE/i))
        .nodeify(done);
    });

     it('should not allow access to a database that was not allowed inside a `do`', (done) => {
      executeProxyQuery(r.expr(true).do(function () {
        return [r.db(secondDbName).tableList(), 4, 5, 9];
      }))
        .then(throwError, expectError.bind(null, 'ReqlDriverError', /DATABASE/i))
        .nodeify(done);
    });

    it('should allow access to a database that is allowed', (done) => {
      executeProxyQuery(r.db(dbName).tableList())
        .then(function (list) {
          list.should.be.instanceof(Array);
        })
        .nodeify(done);
    });

    describe('Connection', () => {
      it('should throw an error when trying to connect with an unallowed database', (done) => {
        r.connect({ port: proxyPort, db: secondDbName })
          .then(function (conn) {
            return r.tableList().run(conn);
          })
          .then(throwError, expectError.bind(null, 'ReqlDriverError', /DATABASE/i))
          .nodeify(done);
      });
    });

   describe('Query arguments', () => {

      it('should not allow a database name to be passed through r.args', function (done) {
        // For some reason, using `executeProxyQuery` doesn't work...
        r.connect({ port: proxyPort }).then(function (conn) {
          return r.db(r.args([dbName])).tableList().run(conn)
            .then(conn.close.bind(conn));
        })
          .then(throwError, expectError.bind(null, 'ReqlDriverError', /DATABASE/i))
          .nodeify(done);
      });

      it('should allow a database name to be passed through r.expr', (done) => {
        executeProxyQuery(r.db(r.expr(dbName)).tableList())
          .then(function (list) {
            list.should.be.instanceof(Array);
          })
          .nodeify(done);
      });

    });

  });

  describe('Table Access', () => {

    before(function (done) {
      this.timeout(5000);
      createDatabase()
        .then(createSecondDatabase)
        .then(() => {
          return new Promise(function (resolve, reject) {
            server = new RethinkDBProxy({
              port: proxyPort,
              dbs: [dbName, 'someOtherDb'],
              tables: dbName + '.' + tableName
            });
            server.listen(resolve);
          });
        })
        .nodeify(done);
    });

    after((done) => {
      dropDatabase()
      .then(server.close.bind(server))
      .then(done.bind(null, null));
    });

    it('should not allow access to a table if not allowed', function (done) {
      this.timeout(5000);
      r.connect({ db: dbName }).then(function (conn) {
        return r.tableCreate('someOtherTable').run(conn)
          .then(function () {
            return conn.close();
          });
      })
      .then(function () {
        return executeProxyQuery(r.db(dbName).table('someOtherTable'))
          .then(throwError, expectError.bind(null, 'ReqlDriverError', /TABLE/i))
          .nodeify(done);
      });
   });

    it('should allow access to a table if allowed', (done) => {
      executeProxyQuery(r.db(dbName).table(tableName))
        .then(function (list) {
          list.should.be.instanceof(Array);
        })
        .nodeify(done);
    });

    describe('Connection', () => {
      it('should not throw an error when trying query a table with an unallowed default database', (done) => {
        r.connect({ port: proxyPort, db: 'someOtherDbNotAllowed' })
          .then(function (conn) {
            return r.table(tableName).run(conn);
          })
         .then(throwError, expectError.bind(null, 'ReqlDriverError', /DATABASE/i))
         .nodeify(done);
      });

      it('should not throw an error when trying query a table with an unallowed table', (done) => {
        r.connect({ port: proxyPort, db: dbName })
          .then(function (conn) {
            return r.table(tableName).coerceTo('array').run(conn);
          })
          .then(function (list) {
            return list.should.be.instanceof(Array);
          })
         .nodeify(done);
      });

      it('should throw an error when trying query a table with an unallowed default database', (done) => {
        r.connect({ port: proxyPort, db: dbName })
          .then(function (conn) {
            return r.table('someOtherTable').run(conn);
          })
         .then(throwError, expectError.bind(null, 'ReqlDriverError', /TABLE/i))
         .nodeify(done);
      });
    });

    describe('Query arguments', () => {

      it('should not allow a table name to be passed through r.args', (done) => {
        executeProxyQuery(r.db(dbName).table(r.args([tableName])))
          .then(throwError, expectError.bind(null, 'ReqlDriverError', /TABLE/i))
          .nodeify(done);
      });

      it('should allow a table name to be passed through r.expr', (done) => {
        executeProxyQuery(r.db(dbName).table(r.expr(tableName)))
          .then(function (list) {
            list.should.be.instanceof(Array);
          })
          .nodeify(done);
      });

      it('should not allow a table name to be passed through a ReQL expression', (done) => {
        executeProxyQuery(r.db(dbName).table(r.db(dbName).tableList()(0)))
          .then(throwError, expectError.bind(null, 'ReqlDriverError', /TABLE/i))
          .nodeify(done);
      });

    });

  });


});
