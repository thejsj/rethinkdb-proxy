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

var proxyPort = 8125;
var server = undefined;

describe('Connection', function () {

  before(function (done) {
    server = new _componentsRethinkdbProxy2['default']({
      port: proxyPort
    });
    server.listen(done);
  });

  after(function (done) {
    server.close().then(done.bind(null, null));
  });

  it('should create a connection successfully', function (done) {
    _bluebird2['default'].resolve().then(function () {
      return [_rethinkdb2['default'].connect(), _rethinkdb2['default'].connect({ port: proxyPort })];
    }).spread(function (connA, connB) {
      connA.port.should.equal(28015);
      connB.port.should.equal(proxyPort);
      connA.constructor.should.equal(connB.constructor);
      done();
    });
  });
});