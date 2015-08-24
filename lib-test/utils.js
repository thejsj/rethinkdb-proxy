/*jshint esnext:true */
'use strict';

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.makeExecuteQuery = makeExecuteQuery;
exports.makeExecuteProxyQuery = makeExecuteProxyQuery;
exports.makeAssertQuery = makeAssertQuery;
exports.makeCreateDatabase = makeCreateDatabase;
exports.makeDropDatabase = makeDropDatabase;

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _rethinkdb = require('rethinkdb');

var _rethinkdb2 = _interopRequireDefault(_rethinkdb);

function makeExecuteQuery(dbName, proxyPort) {
  return function (query) {
    return _bluebird2['default'].resolve().then(function () {
      return [_rethinkdb2['default'].connect({ db: dbName }), _rethinkdb2['default'].connect({ port: proxyPort, db: dbName })];
    }).spread(function (connA, connB) {
      return _bluebird2['default'].all([query.run(connA), query.run(connB)]).spread(function (resultA, resultB) {
        if (typeof resultA.toArray === 'function' && typeof resultA.each === 'function') {
          return _bluebird2['default'].all([resultA.toArray(), resultB.toArray()]);
        }
        return [resultA, resultB];
      })['finally'](function () {
        return _bluebird2['default'].all([connA.close(), connB.close()]);
      });
    });
  };
}

function makeExecuteProxyQuery(dbName, proxyPort) {
  return function (query) {
    return _bluebird2['default'].resolve().then(function () {
      return _rethinkdb2['default'].connect({ port: proxyPort, db: dbName });
    }).then(function (conn) {
      return query.run(conn).then(function (result) {
        if (typeof result.toArray === 'function' && typeof result.each === 'function') {
          return result.toArray();
        }
        return result;
      })['finally'](function () {
        return conn.close();
      });
    });
  };
}

function makeAssertQuery(executeQuery) {
  return function (query) {
    return executeQuery(query).spread(function (resultA, resultB) {
      return resultA.should.eql(resultB);
    });
  };
}

function makeCreateDatabase(dbName, tableName) {
  return function (done) {
    return _rethinkdb2['default'].connect().then(function (conn) {
      return _bluebird2['default'].resolve().then(function () {
        return _rethinkdb2['default'].dbCreate(dbName).run(conn)['catch'](function (err) {});
      }).then(function () {
        return _rethinkdb2['default'].db(dbName).tableCreate(tableName).run(conn)['catch'](function (err) {});
      });
    });
  };
}

function makeDropDatabase(dbName) {
  return function () {
    return _rethinkdb2['default'].connect().then(function (conn) {
      return _rethinkdb2['default'].dbDrop(dbName).run(conn)['finally'](function () {
        return conn.close();
      });
    });
  };
}