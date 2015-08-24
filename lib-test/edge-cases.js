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
var tableName = 'entries';
var server = undefined;

var executeQuery = (0, _utils.makeExecuteQuery)(dbName, proxyPort);
var executeProxyQuery = (0, _utils.makeExecuteProxyQuery)(dbName, proxyPort);
var assertQuery = (0, _utils.makeAssertQuery)(executeQuery);
var createDatabase = (0, _utils.makeCreateDatabase)(dbName, tableName);
var dropDatabase = (0, _utils.makeDropDatabase)(dbName);
var throwError = function throwError(res) {
  throw new Error();
};
var expectError = function expectError(errorName, errorMessageMatch, err) {
  if (errorName !== null) errorName.should.equal(err.name);
  if (errorMessageMatch !== null) err.msg.should.match(errorMessageMatch);
  (err instanceof Error).should.equal(true);
};

describe('Edge Cases', function () {

  var get = _rethinkdb2['default'].db(dbName).table(tableName);

  describe('Replace', function () {

    before(function (done) {
      this.timeout(5000);
      createDatabase().then(function () {
        return new _bluebird2['default'](function (resolve, reject) {
          server = new _componentsRethinkdbProxy2['default']({
            port: proxyPort,
            allowReplace: true
          });
          server.listen(resolve);
        });
      }).then(function () {
        return _rethinkdb2['default'].connect().then(function (conn) {
          return get.insert([{
            id: 1, name: 'Hello'
          }, {
            id: 2, name: 'Jorge'
          }]).run(conn).then(function () {
            return conn.close();
          });
        });
      }).nodeify(done);
    });

    after(function (done) {
      dropDatabase().then(server.close.bind(server)).then(done.bind(null, null));
    });

    it('should not allow a query that passes null to `replace` if `delete` is not allowed', function (done) {
      executeQuery(get.get(1).replace(null)).then(throwError, expectError.bind(null, 'ReqlDriverError', /REPLACE/i)).nodeify(done);
    });

    it('should not allow a query that passes null to `replace` if `delete` is not allowed', function (done) {
      executeQuery(get.replace(null)).then(throwError, expectError.bind(null, 'ReqlDriverError', /REPLACE/i)).nodeify(done);
    });
  });

  describe('Insert', function () {

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
      }).then(function () {
        return _rethinkdb2['default'].connect().then(function (conn) {
          return get.insert([{
            id: 1, name: 'Hello'
          }, {
            id: 2, name: 'Jorge'
          }]).run(conn).then(function () {
            return conn.close();
          });
        });
      }).nodeify(done);
    });

    after(function (done) {
      dropDatabase().then(server.close.bind(server)).then(done.bind(null, null));
    });

    it('should not allow a query that passes `conflict: replace` if `replace` is not allowed', function (done) {
      executeProxyQuery(get.insert({ id: 1, name: 'Hugo' }, { conflict: 'replace' })).then(throwError, expectError.bind(null, 'ReqlDriverError', /INSERT/i)).nodeify(done);
    });

    it('should not allow a query that passes `conflict: update` if `update` is not allowed', function (done) {
      executeProxyQuery(get.insert({ id: 1, name: 'Hugo' }, { conflict: 'update' })).then(throwError, expectError.bind(null, 'ReqlDriverError', /UPDATE/i)).nodeify(done);
    });
  });
});