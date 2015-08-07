/*jshint esnext:true */
import r from 'rethinkdb';
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

  let testData = [
    { name: 'Germany' },
    { name: 'Bhutan' },
    { name: 'Maldives' },
  ];

  before(function (done) {
    this.timeout(10000);
    createDatabase()
      .then(() => {
        return r.connect().then((conn) => {
          return r.db(dbName).table(tableName)
            .insert(testData)
            .run(conn);
        });
      })
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

  it('should handle parallel connections', (done) => {
    //this.timeout(15000);
    let query = function (countryName) {
      return r.db(dbName).table(tableName)
        .filter({ 'name': countryName })
        .coerceTo('array');
    };
    let query1 = query('Germany');
    let query2 = query('Maldives');
    let arr = (() => {
      let arr = [];
      for (let i = 0; i < 5; i += 1) arr.push(i);
      return arr;
    }());
    r.connect({ port: proxyPort }).then((conn1) => {
      return Promise.all(
        [].concat(arr.map(() => query1.run(conn1) ))
          .concat(arr.map(() => query2.run(conn1) ))
      )
      .then((res) => {
        res.slice(0, 5).forEach(row => row[0].name.should.equal('Germany'));
        res.slice(5, 10).forEach(row => row[0].name.should.equal('Maldives'));
      });
    })
      .nodeify(done);
  });

  it('should handle parallel cursors', (done) => {
    r.connect({ port: proxyPort }).then((conn1) => {
      return r.db(dbName).table(tableName).run(conn1)
       .then((cursor) => {
        let processRow = (err, row) => {
          if (err === null) return cursor.next(processRow);
          if (err.msg === 'No more rows in the cursor.') return done();
          return done(err);
        };
        cursor.next(processRow);
       });
    });
  });

});


