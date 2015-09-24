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

describe('Database and Table Access', function () {

  var get = _rethinkdb2['default'].db(dbName).table(tableName);

  describe('allowSysDbAccess', function () {

    describe('Disallow RethinkDB Database Access', function () {

      before(function (done) {
        this.timeout(10000);
        createDatabase().then(function () {
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

      it('should not allow a query that uses the `rethinkdb` database', function (done) {
        executeQuery(_rethinkdb2['default'].db('rethinkdb').tableList()).then(throwError, expectError.bind(null, 'ReqlDriverError', /DATABASE/i)).nodeify(done);
      });

      it('should not allow a query that uses the `rethinkdb` database inside a `do`', function (done) {
        executeQuery(_rethinkdb2['default'].expr(true)['do'](function () {
          return _rethinkdb2['default'].db('rethinkdb').tableList();
        })).then(throwError, expectError.bind(null, 'ReqlDriverError', /DATABASE/i)).nodeify(done);
      });

      it('should not allow a query that uses the `rethinkdb` database inside a `do` inside a `do`', function (done) {
        executeQuery(_rethinkdb2['default'].expr([1, 2, 3])['do'](function (arr) {
          return _rethinkdb2['default'].expr(arr)['do'](function () {
            return _rethinkdb2['default'].db('rethinkdb').tableList();
          });
        })).then(throwError, expectError.bind(null, 'ReqlDriverError', /DATABASE/i)).nodeify(done);
      });

      it('should not allow a query that passes null to `replace` if `delete` is not allowed', function (done) {
        executeQuery(_rethinkdb2['default'].db('rethinkdb').table('server_config')).then(throwError, expectError.bind(null, 'ReqlDriverError', /DATABASE/i)).nodeify(done);
      });
    });

    describe('Allow RethinkDB Database Access', function () {

      before(function (done) {
        this.timeout(10000);
        createDatabase().then(function () {
          return new _bluebird2['default'](function (resolve, reject) {
            server = new _componentsRethinkdbProxy2['default']({
              port: proxyPort,
              allowSysDbAccess: true
            });
            server.listen(resolve);
          });
        }).nodeify(done);
      });

      after(function (done) {
        dropDatabase().then(server.close.bind(server)).then(done.bind(null, null));
      });

      it('should allow a query that uses the `rethinkdb` database, if explicitly set', function (done) {
        executeQuery(_rethinkdb2['default'].db('rethinkdb').tableList()).then(function (res) {
          Array.isArray(res).should.equal(true);
          res.length.should.not.be.equal(0);
        }).nodeify(done);
      });

      it('should allow a query queries the `rehtinkdb` database if explicitly set', function (done) {
        executeQuery(_rethinkdb2['default'].db('rethinkdb').table('server_config').coerceTo('array')).then(function (res) {
          Array.isArray(res).should.equal(true);
          res.length.should.not.be.equal(0);
        }).nodeify(done);
      });
    });
  });

  describe('Database Access', function () {
    before(function (done) {
      this.timeout(10000);
      createDatabase().then(createSecondDatabase).then(function () {
        return new _bluebird2['default'](function (resolve, reject) {
          server = new _componentsRethinkdbProxy2['default']({
            port: proxyPort,
            dbs: [dbName, 'someOtherDb']
          });
          server.listen(resolve);
        });
      }).nodeify(done);
    });

    after(function (done) {
      dropDatabase().then(server.close.bind(server)).then(done.bind(null, null));
    });

    it('should not allow access to a database that was not allowed', function (done) {
      executeProxyQuery(_rethinkdb2['default'].db(secondDbName).tableList()).then(throwError, expectError.bind(null, 'ReqlDriverError', /DATABASE/i)).nodeify(done);
    });

    it('should not allow access to a database that was not allowed inside a `do`', function (done) {
      executeProxyQuery(_rethinkdb2['default'].expr(1)['do'](function () {
        return _rethinkdb2['default'].db(secondDbName).tableList();
      })).then(throwError, expectError.bind(null, 'ReqlDriverError', /DATABASE/i)).nodeify(done);
    });

    it('should not allow access to a database that was not allowed inside a `do`', function (done) {
      executeProxyQuery(_rethinkdb2['default'].expr(true)['do'](function () {
        return [_rethinkdb2['default'].db(secondDbName).tableList(), 4, 5, 9];
      })).then(throwError, expectError.bind(null, 'ReqlDriverError', /DATABASE/i)).nodeify(done);
    });

    it('should allow access to a database that is allowed', function (done) {
      executeProxyQuery(_rethinkdb2['default'].db(dbName).tableList()).then(function (list) {
        list.should.be['instanceof'](Array);
      }).nodeify(done);
    });

    describe('Connection', function () {
      it('should throw an error when trying to connect with an unallowed database', function (done) {
        _rethinkdb2['default'].connect({ port: proxyPort, db: secondDbName }).then(function (conn) {
          return _rethinkdb2['default'].tableList().run(conn);
        }).then(throwError, expectError.bind(null, 'ReqlDriverError', /DATABASE/i)).nodeify(done);
      });
    });

    describe('Query arguments', function () {

      it('should not allow a database name to be passed through r.args', function (done) {
        // For some reason, using `executeProxyQuery` doesn't work...
        _rethinkdb2['default'].connect({ port: proxyPort }).then(function (conn) {
          return _rethinkdb2['default'].db(_rethinkdb2['default'].args([dbName])).tableList().run(conn).then(conn.close.bind(conn));
        }).then(throwError, expectError.bind(null, 'ReqlDriverError', /DATABASE/i)).nodeify(done);
      });

      it('should allow a database name to be passed through r.expr', function (done) {
        executeProxyQuery(_rethinkdb2['default'].db(_rethinkdb2['default'].expr(dbName)).tableList()).then(function (list) {
          list.should.be['instanceof'](Array);
        }).nodeify(done);
      });
    });
  });

  describe('Table Access', function () {

    before(function (done) {
      this.timeout(10000);
      createDatabase().then(createSecondDatabase).then(function () {
        return new _bluebird2['default'](function (resolve, reject) {
          server = new _componentsRethinkdbProxy2['default']({
            port: proxyPort,
            dbs: [dbName, 'someOtherDb'],
            tables: dbName + '.' + tableName
          });
          server.listen(resolve);
        });
      }).nodeify(done);
    });

    after(function (done) {
      dropDatabase().then(server.close.bind(server)).then(done.bind(null, null));
    });

    it('should not allow access to a table if not allowed', function (done) {
      this.timeout(5000);
      _rethinkdb2['default'].connect({ db: dbName }).then(function (conn) {
        return _rethinkdb2['default'].tableCreate('someOtherTable').run(conn).then(function () {
          return conn.close();
        });
      }).then(function () {
        return executeProxyQuery(_rethinkdb2['default'].db(dbName).table('someOtherTable')).then(throwError, expectError.bind(null, 'ReqlDriverError', /TABLE/i)).nodeify(done);
      });
    });

    it('should allow access to a table if allowed', function (done) {
      executeProxyQuery(_rethinkdb2['default'].db(dbName).table(tableName)).then(function (list) {
        list.should.be['instanceof'](Array);
      }).nodeify(done);
    });

    describe('Connection', function () {
      it('should not throw an error when trying query a table with an unallowed default database', function (done) {
        _rethinkdb2['default'].connect({ port: proxyPort, db: 'someOtherDbNotAllowed' }).then(function (conn) {
          return _rethinkdb2['default'].table(tableName).run(conn);
        }).then(throwError, expectError.bind(null, 'ReqlDriverError', /DATABASE/i)).nodeify(done);
      });

      it('should not throw an error when trying query a table with an unallowed table', function (done) {
        _rethinkdb2['default'].connect({ port: proxyPort, db: dbName }).then(function (conn) {
          return _rethinkdb2['default'].table(tableName).coerceTo('array').run(conn);
        }).then(function (list) {
          return list.should.be['instanceof'](Array);
        }).nodeify(done);
      });

      it('should throw an error when trying query a table with an unallowed default database', function (done) {
        _rethinkdb2['default'].connect({ port: proxyPort, db: dbName }).then(function (conn) {
          return _rethinkdb2['default'].table('someOtherTable').run(conn);
        }).then(throwError, expectError.bind(null, 'ReqlDriverError', /TABLE/i)).nodeify(done);
      });
    });

    describe('Query arguments', function () {

      it('should not allow a table name to be passed through r.args', function (done) {
        executeProxyQuery(_rethinkdb2['default'].db(dbName).table(_rethinkdb2['default'].args([tableName]))).then(throwError, expectError.bind(null, 'ReqlDriverError', /TABLE/i)).nodeify(done);
      });

      it('should allow a table name to be passed through r.expr', function (done) {
        executeProxyQuery(_rethinkdb2['default'].db(dbName).table(_rethinkdb2['default'].expr(tableName))).then(function (list) {
          list.should.be['instanceof'](Array);
        }).nodeify(done);
      });

      it('should not allow a table name to be passed through a ReQL expression', function (done) {
        executeProxyQuery(_rethinkdb2['default'].db(dbName).table(_rethinkdb2['default'].db(dbName).tableList()(0))).then(throwError, expectError.bind(null, 'ReqlDriverError', /TABLE/i)).nodeify(done);
      });
    });
  });
});