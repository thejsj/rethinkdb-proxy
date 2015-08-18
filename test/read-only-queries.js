/*jshint esnext:true */
import r from 'rethinkdb';
import Promise from 'bluebird';
import RethinkDBProxy from '../server';
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
  if (errorMessageMatch !== null) err.msg.should.match(errorMessageMatch);
  if (errorName !== null) errorName.should.equal(err.name);
  (err instanceof Error).should.equal(true);
};

describe('Unallowed Queries', () => {
  let get = r.db(dbName).table(tableName);

  before(function (done) {
    this.timeout(5000);
    createDatabase()
      .then(() => {
        server = new RethinkDBProxy({
          port: proxyPort,
        });
        return server.listen().then(done);
      });
  });

  after((done) => {
    dropDatabase()
    .then(server.close.bind(server))
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

    it('should allow for queries inside arrays', (done) => {
      assertQuery(r.expr([ get.coerceTo('array'), get.coerceTo('array') ]))
        .nodeify(done);
    });

  });

  describe('Insert', function () {

    it('should throw an error after attempting to write to the database', (done) => {
      executeProxyQuery(get.insert({ hello: 'world' }))
        .then(throwError, expectError.bind(null, 'ReqlDriverError', /INSERT/i))
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
      executeProxyQuery(r.expr([1, 2, 3]).do(function (row) { return get.insert({ name: row }); }))
        .then(throwError, expectError.bind(null, 'ReqlDriverError', /INSERT/i))
        .nodeify(done);
    });


    it('should not allow for write queries inside arrays', (done) => {
      executeProxyQuery(r.expr([ get.delete(), get.coerceTo('array') ]))
        .then(throwError, expectError.bind(null, 'ReqlDriverError', /DELETE/i))
        .nodeify(done);
    });
  });

  describe('Delete', () => {
    it('should not allow delete queries inside `forEach` inside a `do`', (done) => {
      executeProxyQuery(get.coerceTo('array').do((rows) => {
        return rows.forEach((row) => {
            return get.get(row('id')).delete();
        });
      }))
        .then(throwError, expectError.bind(null, 'ReqlDriverError', /DELETE/i))
        .nodeify(done);
    });
  });

  describe('HTTP', function () {

    it('should not allow http queries inside `map` inside a `do`', (done) => {
      executeProxyQuery(get.coerceTo('array').slice(0, 3).do((rows) => {
        return rows.map((row) => {
            return r.http('http://www.reddit.com/r/javascript.json');
        });
      }))
        .then(throwError, expectError.bind(null, 'ReqlDriverError', /HTTP/i))
        .nodeify(done);
    });

    it('should not allow http queries inside `do`', (done) => {
      executeProxyQuery(r.expr('hello').do((rows) => {
         return r.http('http://www.reddit.com/r/javascript.json');
      }))
        .then(throwError, expectError.bind(null, 'ReqlDriverError', /HTTP/i))
        .nodeify(done);
    });

  });

});
