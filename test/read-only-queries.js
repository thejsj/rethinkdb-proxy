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

describe('Read-only Queries', () => {

  before((done) => {
    createDatabase()
      .then(() => {
        server = startServer({
          port: proxyPort,
          readOnly: true
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

    it('should throw an error after attempting to write to the database', (done) => {
      let get = r.db(dbName).table(tableName);
      executeProxyQuery(get.insert({ hello: 'world' }))
        .then(function (res) {
          throw new Error();
        })
        .catch(function (err) {
          (err instanceof Error).should.equal(true);
        })
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
      let get = r.db(dbName).table(tableName);
      executeProxyQuery(r.expr([1, 2, 3]).do(function (row) { return get.insert(row); }))
        .then(function (res) {
          throw new Error();
        })
        .catch(function (err) {
          (err instanceof Error).should.equal(true);
        })
        .nodeify(done);
    });
  });

});
