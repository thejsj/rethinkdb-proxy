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
  console.log('Err.msg', errorMessageMatch, err.msg);
  if (errorName !== null) errorName.should.equal(err.name);
  if (errorMessageMatch !== null) err.msg.should.match(errorMessageMatch);
  (err instanceof Error).should.equal(true);
};

describe('Edge Cases', () => {

  let get = r.db(dbName).table(tableName);

  describe('Replace', () => {

    before(function (done) {
      this.timeout(5000);
      createDatabase()
        .then(() => {
          return new Promise(function (resolve, reject) {
            server = new RethinkDBProxy({
              port: proxyPort,
              allowReplace: true,
            });
            server.listen(resolve);
          });
        })
        .then(() => {
         return r.connect().then((conn) => {
          return get.insert([{
              id: 1, name: 'Hello'
            }, {
              id: 2, name: 'Jorge'
            }]).run(conn).then(() => {
             return conn.close();
           });
         });
        })
        .nodeify(done);
    });

    after((done) => {
      dropDatabase()
      .then(server.close.bind(server))
      .then(done.bind(null, null));
    });

   it('should not allow a query that passes null to `replace` if `delete` is not allowed', (done) => {
      executeQuery(get.get(1).replace(null))
        .then(throwError, expectError.bind(null, 'RqlClientError', /REPLACE/i))
        .nodeify(done);
    });

   it('should not allow a query that passes null to `replace` if `delete` is not allowed', (done) => {
      executeQuery(get.replace(null))
        .then(throwError, expectError.bind(null, 'RqlClientError', /REPLACE/i))
        .nodeify(done);
    });

  });

  describe('Insert', () => {

    before(function (done) {
      this.timeout(5000);
      createDatabase()
        .then(() => {
          return new Promise(function (resolve, reject) {
            server = new RethinkDBProxy({
              port: proxyPort,
              allowInsert: true,
            });
            server.listen(resolve);
          });
        })
        .then(() => {
         return r.connect().then((conn) => {
          return get.insert([{
              id: 1, name: 'Hello'
            }, {
              id: 2, name: 'Jorge'
            }]).run(conn).then(() => {
             return conn.close();
           });
         });
        })
        .nodeify(done);
    });

    after((done) => {
      dropDatabase()
      .then(server.close.bind(server))
      .then(done.bind(null, null));
    });

   it('should not allow a query that passes `conflict: replace` if `replace` is not allowed', (done) => {
      executeProxyQuery(get.insert({ id: 1, name: 'Hugo'}, { conflict: 'replace' }))
        .then(throwError, expectError.bind(null, 'RqlClientError', /INSERT/i))
        .nodeify(done);
    });

   it('should not allow a query that passes `conflict: update` if `update` is not allowed', (done) => {
      executeProxyQuery(get.insert({ id: 1, name: 'Hugo'}, { conflict: 'update' }))
        .then(throwError, expectError.bind(null, 'RqlClientError', /UPDATE/i))
        .nodeify(done);
    });

  });

});
