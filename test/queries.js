/*jshint esnext:true */
import r from 'rethinkdb';
import Promise from 'bluebird';
import server from '../server';
import should from 'should';
import { makeExecuteQuery, makeAssertQuery, makeCreateDatabase, makeDropDatabase } from './utils';

let proxyPort = 8125;
let dbName = 'rethinkdb_proxy_test';
let tableName = 'entries';

let executeQuery = makeExecuteQuery(dbName, proxyPort);
let assertQuery = makeAssertQuery(executeQuery);
let createDatabase = makeCreateDatabase(dbName, tableName);
let dropDatabase = makeDropDatabase(dbName);

describe('Queries', () => {

  before((done) => {
    createDatabase()
      .then(() => {
        server(proxyPort, done);
      });
  });

  after((done) => {
    dropDatabase()
      .nodeify(done);
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

    it('should return the same result after a write', (done) => {
      let get = r.db(dbName).table(tableName);
      executeQuery(get.insert({ hello: 'world'}))
       .then(() => {
         return assertQuery(get);
       })
       .then(() => {
         return r.connect().then((conn) => {
           return get.count().run(conn)
             .then((count) => {
               count.should.eql(2);
             });
         });
       })
       .nodeify(done);
    });

  });

});
