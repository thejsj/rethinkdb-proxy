/*jshint esnext:true */
import r from 'rethinkdb';
import Promise from 'bluebird';
import startServer from '../server';
import should from 'should';
import { makeExecuteQuery, makeExecuteProxyQuery, makeAssertQuery, makeCreateDatabase, makeDropDatabase } from './utils';
import protoDef from '../driver/proto-def';

let proxyPort = 8125;
let dbName = 'rethinkdb_proxy_test';
let tableName = 'entries';
let server;

let executeQuery = makeExecuteQuery(dbName, proxyPort);
let executeProxyQuery = makeExecuteProxyQuery(dbName, proxyPort);
let assertQuery = makeAssertQuery(executeQuery);
let createDatabase = makeCreateDatabase(dbName, tableName);
let dropDatabase = makeDropDatabase(dbName);
let throwError = function (res) { throw new Error(); };
let expectError = function (errorName, errorMessageMatch, err) {
  if (errorName !== null) errorName.should.equal(err.name);
  if (errorMessageMatch !== null) err.msg.should.match(errorMessageMatch);
  (err instanceof Error).should.equal(true);
};

describe('Read-only Queries', () => {

  before((done) => {
    createDatabase()
      .then(() => {
        server = startServer({
          port: proxyPort,
        }, done);
      });
  });

  after((done) => {
    dropDatabase()
    .then(server.close)
    .then(done.bind(null, null));
  });

  describe('Read Queries', () => {

     it('should return an `r.expr` successfully', (done) => {
      assertQuery(r.expr([1, 2, 3]))
       .nodeify(done);
    });

    it('should return the same list of databases', (done) => {
      assertQuery(r.dbList())
       .nodeify(done);
    });

  });

  describe('Write Queries', function () {

    let get = r.db(dbName).table(tableName);
    it('should throw an error after attempting to write to the database', (done) => {
      executeProxyQuery(get.insert({ hello: 'world' }))
        .then(throwError, expectError.bind(null, 'RqlClientError', /INSERT/i))
        .nodeify(done);
    });

    it('should not throw an error when using the same number as the `write` proto buff definition', (done) => {
      executeProxyQuery(r.expr([protoDef.Term.TermType.INSERT, 1, 2, 3]))
        .then(function (res) {
          res.should.eql([protoDef.Term.TermType.INSERT, 1, 2, 3]);
        })
        .nodeify(done);
    });

    it('should not allow insert queries inside `do`', (done) => {
      executeProxyQuery(r.expr([1, 2, 3]).do(function (row) { return get.insert(row); }))
        .then(throwError, expectError.bind(null, 'RqlClientError', /INSERT/i))
        .nodeify(done);
    });

    it('should not allow delete queries inside `forEach` inside a `do`', (done) => {
      executeProxyQuery(get.coerceTo('array').do(function (rows) {
        return rows.forEach(function (row) {
            return get.get(row('id')).delete();
        });
      }))
        .then(throwError, expectError.bind(null, 'RqlClientError', /DELETE/i))
        .nodeify(done);
    });

    it('should allow for queries inside arrays', (done) => {
      executeProxyQuery(r.expr([ get.delete(), get.coerceTo('array') ]))
        .then(throwError, expectError.bind(null, 'RqlClientError', /DELETE/i))
        .nodeify(done);
    });
  });

});
