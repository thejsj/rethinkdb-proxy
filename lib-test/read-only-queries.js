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
  if (errorMessageMatch !== null) err.msg.should.match(errorMessageMatch);
  if (errorName !== null) errorName.should.equal(err.name);
  (err instanceof Error).should.equal(true);
};

describe('Unallowed Queries', function () {
  var get = _rethinkdb2['default'].db(dbName).table(tableName);

  before(function (done) {
    this.timeout(5000);
    createDatabase().then(function () {
      server = new _componentsRethinkdbProxy2['default']({
        port: proxyPort
      });
      return server.listen().then(done);
    });
  });

  after(function (done) {
    dropDatabase().then(server.close.bind(server)).then(done.bind(null, null));
  });

  describe('Read Queries', function () {

    it('should return an `r.expr` successfully', function (done) {
      assertQuery(_rethinkdb2['default'].expr([1, 2, 3])).nodeify(done);
    });

    it('should return the same list of databases', function (done) {
      assertQuery(_rethinkdb2['default'].dbList()).nodeify(done);
    });

    it('should allow for queries inside arrays', function (done) {
      assertQuery(_rethinkdb2['default'].expr([get.coerceTo('array'), get.coerceTo('array')])).nodeify(done);
    });
  });

  describe('Insert', function () {

    it('should throw an error after attempting to write to the database', function (done) {
      executeProxyQuery(get.insert({ hello: 'world' })).then(throwError, expectError.bind(null, 'ReqlDriverError', /INSERT/i)).nodeify(done);
    });

    it('should not throw an error when using the same number as the `write` proto buff definition', function (done) {
      executeProxyQuery(_rethinkdb2['default'].expr([_node_modulesRethinkdbProtoDef2['default'].Term.TermType.INSERT, 1, 2, 3])).then(function (res) {
        res.should.eql([_node_modulesRethinkdbProtoDef2['default'].Term.TermType.INSERT, 1, 2, 3]);
      }).nodeify(done);
    });

    it('should not allow insert queries inside `do`', function (done) {
      executeProxyQuery(_rethinkdb2['default'].expr([1, 2, 3])['do'](function (row) {
        return get.insert({ name: row });
      })).then(throwError, expectError.bind(null, 'ReqlDriverError', /INSERT/i)).nodeify(done);
    });

    it('should not allow for write queries inside arrays', function (done) {
      executeProxyQuery(_rethinkdb2['default'].expr([get['delete'](), get.coerceTo('array')])).then(throwError, expectError.bind(null, 'ReqlDriverError', /DELETE/i)).nodeify(done);
    });
  });

  describe('Delete', function () {
    it('should not allow delete queries inside `forEach` inside a `do`', function (done) {
      executeProxyQuery(get.coerceTo('array')['do'](function (rows) {
        return rows.forEach(function (row) {
          return get.get(row('id'))['delete']();
        });
      })).then(throwError, expectError.bind(null, 'ReqlDriverError', /DELETE/i)).nodeify(done);
    });
  });

  describe('HTTP', function () {

    it('should not allow http queries inside `map` inside a `do`', function (done) {
      executeProxyQuery(get.coerceTo('array').slice(0, 3)['do'](function (rows) {
        return rows.map(function (row) {
          return _rethinkdb2['default'].http('http://www.reddit.com/r/javascript.json');
        });
      })).then(throwError, expectError.bind(null, 'ReqlDriverError', /HTTP/i)).nodeify(done);
    });

    it('should not allow http queries inside `do`', function (done) {
      executeProxyQuery(_rethinkdb2['default'].expr('hello')['do'](function (rows) {
        return _rethinkdb2['default'].http('http://www.reddit.com/r/javascript.json');
      })).then(throwError, expectError.bind(null, 'ReqlDriverError', /HTTP/i)).nodeify(done);
    });
  });
});