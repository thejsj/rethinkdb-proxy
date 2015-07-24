/*jshint esnext:true */
import r from 'rethinkdb';
import Promise from 'bluebird';
import startServer from '../server';
import should from 'should';
import { makeExecuteQuery, makeAssertQuery, makeCreateDatabase, makeDropDatabase } from './utils';

let proxyPort = 8125;
let dbName = 'rethinkdb_proxy_test';
let tableName = 'entries';
let server;

let executeQuery = makeExecuteQuery(dbName, proxyPort);
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
    server.close().then(dropDatabase)
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

  describe('Write Queries', () => {

    it('should throw an error after attempting to write to the database', (done) => {
      let get = r.db(dbName).table(tableName);
      executeQuery(get.insert({ hello: 'world' }))
      .then(function (res) {
        done(new Error());
      })
        .catch(function (err) {
          (err instanceof Error).should.equal(true);
          done();
        });
    });
  });

});
