/*jshint esnext:true */
import r from 'rethinkdb';
import Promise from 'bluebird';
import startServer from '../server';
import should from 'should';
import { makeExecuteQuery, makeExecuteProxyQuery, makeAssertQuery, makeCreateDatabase, makeDropDatabase } from './utils';
import protoDef from '../driver/proto-def';

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
              server = startServer({
                port: proxyPort,
              }, resolve);
            });
          })
          .nodeify(done);
      });

      after((done) => {
        dropDatabase()
        .then(server.close)
        .then(done.bind(null, null));
      });

     it('should not allow a query that uses the `rethinkdb` database', (done) => {
       executeQuery(r.db('rethinkdb').tableList())
        .then(throwError, expectError.bind(null, 'RqlClientError', /DATABASE/i))
        .nodeify(done);
     });

     it('should not allow a query that uses the `rethinkdb` database inside a `do`', (done) => {
       executeQuery(r.expr(true).do(function () {
         return r.db('rethinkdb').tableList();
       }))
        .then(throwError, expectError.bind(null, 'RqlClientError', /DATABASE/i))
        .nodeify(done);
     });

     it('should not allow a query that uses the `rethinkdb` database inside a `do` inside a `do`', (done) => {
       executeQuery(r.expr([1, 2, 3]).do(function (arr) {
         return r.expr(arr).do(function () {
           return r.db('rethinkdb').tableList();
         });
       }))
        .then(throwError, expectError.bind(null, 'RqlClientError', /DATABASE/i))
        .nodeify(done);
     });

     it('should not allow a query that passes null to `replace` if `delete` is not allowed', (done) => {
        executeQuery(r.db('rethinkdb').table('server_config'))
          .then(throwError, expectError.bind(null, 'RqlClientError', /DATABASE/i))
          .nodeify(done);
      });

    });

    describe('Allow RethinkDB Database Access', () => {

      before(function (done) {
        this.timeout(5000);
        createDatabase()
          .then(() => {
            return new Promise(function (resolve, reject) {
              server = startServer({
                port: proxyPort,
                allowSysDbAccess: true
              }, resolve);
            });
          })
          .nodeify(done);
      });

      after((done) => {
        dropDatabase()
        .then(server.close)
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
            server = startServer({
              port: proxyPort,
              db: [dbName, 'someOtherDb']
            }, resolve);
          });
        })
        .nodeify(done);
    });

    after((done) => {
      dropDatabase()
      .then(server.close)
      .then(done.bind(null, null));
    });


    it('should not allow access to a database that was not allowed', (done) => {
      executeProxyQuery(r.db(secondDbName).tableList())
        .then(throwError, expectError.bind(null, 'RqlClientError', /DATABASE/i))
        .nodeify(done);
    });

    it('should not allow access to a database that was not allowed inside a `do`', (done) => {
      executeProxyQuery(r.expr(1).do(function () {
        return r.db(secondDbName).tableList();
      }))
        .then(throwError, expectError.bind(null, 'RqlClientError', /DATABASE/i))
        .nodeify(done);
    });

     it('should not allow access to a database that was not allowed inside a `do`', (done) => {
      executeProxyQuery(r.expr(true).do(function () {
        return [r.db(secondDbName).tableList(), 4, 5, 9];
      }))
        .then(throwError, expectError.bind(null, 'RqlClientError', /DATABASE/i))
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
          .then(throwError, expectError.bind(null, 'RqlClientError', /DATABASE/i))
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
            server = startServer({
              port: proxyPort,
              db: [dbName, 'someOtherDb'],
              table: tableName
            }, resolve);
          });
        })
        .nodeify(done);
    });

    after((done) => {
      dropDatabase()
      .then(server.close)
      .then(done.bind(null, null));
    });

    it('should not allow access to a table if not allowed', (done) => {
      executeProxyQuery(r.db(dbName).table('someOtherTable'))
        .then(throwError, expectError.bind(null, 'RqlClientError', /DATABASE/i))
        .nodeify(done);
    });

    it('should allow access to a table if allowed', (done) => {
      executeProxyQuery(r.db(dbName).table(tableName))
        .then(function (list) {
          list.should.be.instanceof(Array);
        })
        .nodeify(done);
    });

    describe('Connection', () => {
      it('should throw an error when trying to connect with an unallowed database', (done) => {
        r.connect({ port: proxyPort, db: dbName })
          .then(function (conn) {
            return r.table(tableName).run(conn);
          })
         .then(throwError, expectError.bind(null, 'RqlClientError', /DATABASE/i))
         .nodeify(done);
      });
    });
  });

});
