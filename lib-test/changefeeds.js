/*jshint esnext:true */
'use strict';

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

var _rethinkdb = require('rethinkdb');

var _rethinkdb2 = _interopRequireDefault(_rethinkdb);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _componentsRethinkdbProxy = require('./components/rethinkdb-proxy');

var _componentsRethinkdbProxy2 = _interopRequireDefault(_componentsRethinkdbProxy);

var _should = require('should');

var _should2 = _interopRequireDefault(_should);

var _utils = require('./utils');

var _node_modulesRethinkdbProtoDef = require('../node_modules/rethinkdb/proto-def');

var _node_modulesRethinkdbProtoDef2 = _interopRequireDefault(_node_modulesRethinkdbProtoDef);

var proxyPort = 8125;
var dbName = 'rethinkdb_proxy_test';
var secondDbName = 'rethinkdb_proxy_test_2';
var tableName = 'entries';
var server = undefined;

var executeQuery = (0, _utils.makeExecuteQuery)(dbName, proxyPort);
var executeProxyQuery = (0, _utils.makeExecuteProxyQuery)(dbName, proxyPort);
var assertQuery = (0, _utils.makeAssertQuery)(executeQuery);
var createDatabase = (0, _utils.makeCreateDatabase)(dbName, tableName);
var createSecondDatabase = (0, _utils.makeCreateDatabase)(secondDbName, tableName);
var dropDatabase = (0, _utils.makeDropDatabase)(dbName);
var throwError = function throwError(res) {
  throw new Error();
};
var expectError = function expectError(errorName, errorMessageMatch, err) {
  if (errorName !== null) errorName.should.equal(err.name);
  if (errorMessageMatch !== null) err.msg.should.match(errorMessageMatch);
  (err instanceof Error).should.equal(true);
};
var closeCursorAndConn = function closeCursorAndConn(cursor, conn) {
  return cursor.close().then(function () {
    return conn.close();
  });
};
var ce = function ce(err) {
  console.log('Error');
  console.log(err);
  throw err;
};

describe('Changefeeds', function () {

  before(function (done) {
    this.timeout(5000);
    createDatabase().then(function () {
      return new _bluebird2['default'](function (resolve, reject) {
        server = new _componentsRethinkdbProxy2['default']({
          port: proxyPort,
          allowInsert: true
        });
        server.listen(resolve);
      });
    }).nodeify(done);
  });

  after(function (done) {
    dropDatabase().then(server.close.bind(server)).then(done.bind(null, null));
  });

  it('should listen for changes', function (done) {
    this.timeout(10000);
    var count = 0,
        results = [],
        cursor;
    // HINT: You'll need to pass an anonymous function to `filter`
    _rethinkdb2['default'].connect({ port: proxyPort, db: dbName }).then(function (conn) {
      return _rethinkdb2['default'].table(tableName).changes().run(conn).then(function (_cursor) {
        cursor = _cursor;
        cursor.each(function (err, row) {
          count += 1;
          results.push(row);
        });
      }).then(function () {
        return _rethinkdb2['default'].connect({ port: proxyPort, db: dbName }).then(function (conn) {
          return _bluebird2['default'].all([_rethinkdb2['default'].table(tableName).insert({ name: 'SomeCountryName', population: 1 }).run(conn)['catch'](ce), _rethinkdb2['default'].table(tableName).insert({ name: 'Transylvania', population: 2000 }).run(conn)['catch'](ce), _rethinkdb2['default'].table(tableName).insert({ name: 'Hong Kong', population: 1500 }).run(conn), _rethinkdb2['default'].table(tableName).insert({ name: 'Bavaira', population: 98 }).run(conn)]).then(conn.close.bind(conn));
        });
      }).then(function () {
        return new _bluebird2['default'](function (resolve, reject) {
          setTimeout(function () {
            count.should.equal(4);
            results.should.be.instanceOf(Array);
            results = results.sort(function (a, b) {
              return a.new_val.population - b.new_val.population;
            });
            results[0].new_val.population.should.equal(1);
            results[1].new_val.population.should.equal(98);
            results[0].new_val.should.have.property('name');
            results[1].new_val.should.have.property('name');
            resolve();
          }, 50); // Hopefully, this is enough
        });
      }).then(function () {
        return closeCursorAndConn(cursor, conn);
      }).nodeify(done);
    });
  });

  it('should listen for multiple changesfeeds', function (done) {
    this.timeout(10000);
    var first_count = 0,
        second_count = 0,
        results = [],
        cursor;
    return _bluebird2['default'].all([_rethinkdb2['default'].connect({ port: proxyPort, db: dbName }).then(function (conn) {
      return _rethinkdb2['default'].table(tableName).filter(_rethinkdb2['default'].row('population').lt(500)).changes().run(conn).then(function (cursor) {
        cursor.each(function (err, row) {
          first_count += 1;
          results.push(row);
        }, conn.close.bind(conn));
      });
    }), _rethinkdb2['default'].connect({ port: proxyPort, db: dbName }).then(function (conn) {
      return _rethinkdb2['default'].table(tableName).filter(_rethinkdb2['default'].row('population').gt(500)).changes().run(conn).then(function (cursor) {
        cursor.each(function (err, row) {
          second_count += 1;
          results.push(row);
        }, conn.close.bind(conn));
      });
    })]).then(function () {
      return _rethinkdb2['default'].connect({ port: proxyPort, db: dbName }).then(function (conn) {
        return _bluebird2['default'].all([_rethinkdb2['default'].table(tableName).insert({ name: 'SomeCountryName', population: 1 }).run(conn)['catch'](ce), _rethinkdb2['default'].table(tableName).insert({ name: 'Transylvania', population: 2000 }).run(conn)['catch'](ce), _rethinkdb2['default'].table(tableName).insert({ name: 'Hong Kong', population: 1500 }).run(conn), _rethinkdb2['default'].table(tableName).insert({ name: 'Bavaira', population: 98 }).run(conn)]).then(conn.close.bind(conn));
      });
    }).then(function () {
      return new _bluebird2['default'](function (resolve, reject) {
        setTimeout(function () {
          first_count.should.equal(2);
          second_count.should.equal(2);
          results.should.be.instanceOf(Array);
          results = results.sort(function (a, b) {
            return a.new_val.population - b.new_val.population;
          });
          results[0].new_val.population.should.equal(1);
          results[1].new_val.population.should.equal(98);
          results[0].new_val.should.have.property('name');
          results[1].new_val.should.have.property('name');
          resolve();
        }, 50); // Hopefully, this is enough
      });
    }).nodeify(done);
  });
});