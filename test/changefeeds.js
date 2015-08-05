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
let closeCursorAndConn = function (cursor, conn) {
  return cursor.close()
   .then(function () {
    return conn.close();
   });
};
let ce = function (err) {
  console.log('Error');
  console.log(err);
  throw err;
};

describe('Changefeeds', () => {

  before(function (done) {
    this.timeout(5000);
    createDatabase()
      .then(() => {
        return new Promise(function (resolve, reject) {
          server = new RethinkDBProxy({
            port: proxyPort,
            allowInsert: true
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

  it('should listen for changes', function (done) {
    this.timeout(10000);
    var count = 0, results = [], cursor;
    // HINT: You'll need to pass an anonymous function to `filter`
    r.connect({ port: proxyPort, db: dbName }).then((conn) => {
      return r.table(tableName).changes().run(conn)
      .then(function (_cursor) {
        cursor = _cursor;
        cursor.each(function (err, row) {
          count += 1;
          results.push(row);
        });
      })
      .then(function () {
        return r.connect({ port: proxyPort, db: dbName }).then((conn) => {
          return Promise.all([
            r.table(tableName).insert({ name: 'SomeCountryName', population: 1 }).run(conn).catch(ce),
            r.table(tableName).insert({ name: 'Transylvania', population: 2000 }).run(conn).catch(ce),
            r.table(tableName).insert({ name: 'Hong Kong', population: 1500 }).run(conn),
            r.table(tableName).insert({ name: 'Bavaira', population: 98 }).run(conn),
          ])
          .then(conn.close.bind(conn));
        });
    })
      .then(function () {
        return new Promise(function (resolve, reject) {
          setTimeout(function () {
            count.should.equal(4);
            results.should.be.instanceOf(Array);
            results = results.sort((a, b) => a.new_val.population - b.new_val.population);
            results[0].new_val.population.should.equal(1);
            results[1].new_val.population.should.equal(98);
            results[0].new_val.should.have.property('name');
            results[1].new_val.should.have.property('name');
            resolve();
          }, 50); // Hopefully, this is enough
        });
      })
      .then(function () {
        return closeCursorAndConn(cursor, conn);
      })
      .nodeify(done);
    });
  });

  it('should listen for multiple changesfeeds', function (done) {
    this.timeout(10000);
    var first_count = 0, second_count = 0, results = [], cursor;
    return Promise.all([
      r.connect({ port: proxyPort, db: dbName }).then((conn) => {
        return r.table(tableName).filter(r.row('population').lt(500)).changes().run(conn)
        .then(function (cursor) {
          cursor.each(function (err, row) {
            first_count += 1;
            results.push(row);
          }, conn.close.bind(conn));
        });
       }),
       r.connect({ port: proxyPort, db: dbName }).then((conn) => {
        return r.table(tableName).filter(r.row('population').gt(500)).changes().run(conn)
        .then(function (cursor) {
          cursor.each(function (err, row) {
            second_count += 1;
            results.push(row);
          }, conn.close.bind(conn));
        });
      })
    ])
     .then(function () {
        return r.connect({ port: proxyPort, db: dbName }).then((conn) => {
          return Promise.all([
            r.table(tableName).insert({ name: 'SomeCountryName', population: 1 }).run(conn).catch(ce),
            r.table(tableName).insert({ name: 'Transylvania', population: 2000 }).run(conn).catch(ce),
            r.table(tableName).insert({ name: 'Hong Kong', population: 1500 }).run(conn),
            r.table(tableName).insert({ name: 'Bavaira', population: 98 }).run(conn),
          ])
          .then(conn.close.bind(conn));
        });
    })
      .then(function () {
        return new Promise(function (resolve, reject) {
          setTimeout(function () {
            first_count.should.equal(2);
            second_count.should.equal(2);
            results.should.be.instanceOf(Array);
            results = results.sort((a, b) => a.new_val.population - b.new_val.population);
            results[0].new_val.population.should.equal(1);
            results[1].new_val.population.should.equal(98);
            results[0].new_val.should.have.property('name');
            results[1].new_val.should.have.property('name');
            resolve();
          }, 50); // Hopefully, this is enough
        });
      })
      .nodeify(done);
  });

});
