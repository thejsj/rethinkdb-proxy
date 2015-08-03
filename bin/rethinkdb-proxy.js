#! /usr/bin/env node
var cli = require('cli').enable('status');
var taser = require('taser');
require('babel/register');
var RethinkDBProxy = require('../server/');

cli.parse({
  'port':               [false, 'Port in which to listen for driver connections', 'number', null],
  'dbs':                [false, 'Databases allowed', 'string', null],
  'tables':             [false, 'Tables allowed. Must include dot (`db.table`) if multiple database allowed.', 'string', null],
  'allow-writes':       [false, 'Allow all operations that write to the database (`insert`, `update`, `delete`)'],
  'allow-insert':       [false, 'Allow `insert` queries'],
  'allow-update':       [false, 'Allow `update` queries'],
  'allow-delete':       [false, 'Allow `delete` queries'],
  'allow-replace':      [false, 'Allow `replace` queries'],
  'allow-db-create':    [false, 'Allow `dbCreate` queries'],
  'allow-db-drop':      [false, 'Allow `dbDrop` queries'],
  'allow-table-create': [false, 'Allow `tableCreate` queries'],
  'allow-table-drop':   [false, 'Allow `tableDrop` queries'],
  'allow-indexes':      [false, 'Allow all operations on indexes (`indexCreate`, `indexDrop`, `indexRename`)'],
  'allow-index-create': [false, 'Allow `indexCreate` queries'],
  'allow-index-drop':   [false, 'Allow `indexDrop` queries'],
  'allow-index-rename': [false, 'Allow `indexRename` queries'],
  'allow-reconfigure':  [false, 'Allow `reconfigure` queries'],
  'allow-rebalance':    [false, 'Allow `rebalance` queries'],
  'allow-http':         [false, 'Allow queries with the `http` term'],
  'allow-javascript':   [false, 'Allow queries with the `js` term']
});

cli.main(function (args, _opts) {
  var opts = {};
  for (var key in _opts) {
    if (_opts.hasOwnProperty(key) && _opts[key] !== null) {
      opts[key.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); })] = _opts[key];
    }
  }
  var server = new RethinkDBProxy(opts);
  server.listen(opts.port);
});
