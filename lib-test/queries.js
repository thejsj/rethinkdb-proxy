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

var proxyPort = 8125;
var dbName = 'rethinkdb_proxy_test';
var tableName = 'entries';
var server = undefined;

var executeQuery = (0, _utils.makeExecuteQuery)(dbName, proxyPort);
var assertQuery = (0, _utils.makeAssertQuery)(executeQuery);
var createDatabase = (0, _utils.makeCreateDatabase)(dbName, tableName);
var dropDatabase = (0, _utils.makeDropDatabase)(dbName);

describe('Normal Queries', function () {

  before(function (done) {
    this.timeout(5000);
    createDatabase().then(function () {
      server = new _componentsRethinkdbProxy2['default']({
        port: proxyPort,
        allowWrites: true
      });
      server.listen(done);
    });
  });

  after(function (done) {
    server.close().then(dropDatabase).then(done.bind(null, null));
  });

  describe('Read Queries', function () {

    it('should return an `r.expr` successfully', function (done) {
      assertQuery(_rethinkdb2['default'].expr([1, 2, 3])).nodeify(done);
    });

    it('should return the same list of databases', function (done) {
      assertQuery(_rethinkdb2['default'].dbList()).nodeify(done);
    });

    it('should handle group queries', function (done) {
      assertQuery(_rethinkdb2['default'].expr([{ 'v': 1 }, { 'v': 2 }, { 'v': 2 }, { 'v': 4 }]).group('v').count().ungroup()).nodeify(done);
    });
  });

  describe('Write Queries', function () {

    it('should return the same result after a write', function (done) {
      var get = _rethinkdb2['default'].db(dbName).table(tableName);
      executeQuery(get.insert({ hello: 'world' })).then(function () {
        return assertQuery(get.orderBy('id'));
      }).then(function () {
        return _rethinkdb2['default'].connect().then(function (conn) {
          return get.count().run(conn).then(function (count) {});
        });
      }).nodeify(done);
    });
  });
});

//count.should.eql(2);