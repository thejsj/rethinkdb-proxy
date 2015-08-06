/*jshint esnext:true */
import r from '../driver';
import Promise from 'bluebird';
import RethinkDBProxy from '../server';
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

describe('Parallel Queries', () => {

  before(function (done) {
    this.timeout(10000);
    createDatabase()
      .then(() => {
        return r.connect().then((conn) => {
          return r.db(dbName).table(tableName)
            .insert(r.json(r.http(
              'https://raw.githubusercontent.com/thejsj/sample-data/master/data/countries.json'
            ))).run(conn)
              .then(conn.close.bind(conn, { noreplyWait: false }));
        });
      })
      .then(() => {
        return new Promise(function (resolve, reject) {
          console.log('Start Server');
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

  it('should handle parallel connections', function (done) {
    //this.timeout(15000);
    r.connect({ port: proxyPort }).then(function (conn1) {
      console.log('CONNECT');
      return r.db(dbName).table(tableName)
        //.filter(function (row) {
          //return row('name').eq('Germany');
        //})
        .filter({ 'name': 'Germany' })
        .coerceTo('array')
        .run(conn1);
    })
      .catch(function (err) {
        console.log('ERR', err);
      })
      .then(function (res) {
        console.log('res', res);
        done();
      });
  });

});


