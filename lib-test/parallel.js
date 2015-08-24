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

describe('Parallel Queries', function () {

  var testData = [{ name: 'Germany' }, { name: 'Bhutan' }, { name: 'Maldives' }];

  before(function (done) {
    this.timeout(10000);
    createDatabase().then(function () {
      return _rethinkdb2['default'].connect().then(function (conn) {
        return _rethinkdb2['default'].db(dbName).table(tableName).insert(testData).run(conn);
      });
    }).then(function () {
      return new _bluebird2['default'](function (resolve, reject) {
        server = new _componentsRethinkdbProxy2['default']({
          port: proxyPort
        });
        server.listen(resolve);
      });
    }).nodeify(done);
  });

  after(function (done) {
    dropDatabase().then(server.close.bind(server)).then(done.bind(null, null));
  });

  it('should handle parallel connections', function (done) {
    //this.timeout(15000);
    var query = function query(countryName) {
      return _rethinkdb2['default'].db(dbName).table(tableName).filter({ 'name': countryName }).coerceTo('array');
    };
    var query1 = query('Germany');
    var query2 = query('Maldives');
    var arr = (function () {
      var arr = [];
      for (var i = 0; i < 5; i += 1) {
        arr.push(i);
      }return arr;
    })();
    _rethinkdb2['default'].connect({ port: proxyPort }).then(function (conn1) {
      return _bluebird2['default'].all([].concat(arr.map(function () {
        return query1.run(conn1);
      })).concat(arr.map(function () {
        return query2.run(conn1);
      }))).then(function (res) {
        res.slice(0, 5).forEach(function (row) {
          return row[0].name.should.equal('Germany');
        });
        res.slice(5, 10).forEach(function (row) {
          return row[0].name.should.equal('Maldives');
        });
      });
    }).nodeify(done);
  });

  it('should handle parallel cursors', function (done) {
    _rethinkdb2['default'].connect({ port: proxyPort }).then(function (conn1) {
      return _rethinkdb2['default'].db(dbName).table(tableName).run(conn1).then(function (cursor) {
        var processRow = function processRow(err, row) {
          if (err === null) return cursor.next(processRow);
          if (err.msg === 'No more rows in the cursor.') return done();
          return done(err);
        };
        cursor.next(processRow);
      });
    });
  });
});