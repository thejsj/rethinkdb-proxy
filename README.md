# RethinkDB Proxy

*Reverse proxy for RethinkDB*

Make your RethinkDB publicly accessible through limiting what kind of queries can be executed on your RethinkDB database.

## Introduction

Get all users in a table is allowed:

```javascript
import rethinkDBProxy from 'rethinkdb-proxy';
rethinkDBProxy({ port: 8125 });

r.connect({ port: 8125 }).then((conn) => {
  r.table('users').coerceTo('array').run(conn)
    .then((results) => {
      // We have some results!
      console.log(results); // [{ name: 'jorge' }, ... ]
    });
});
```
But deleting the users **is not**:

```javascript
import rethinkDBProxy from 'rethinkdb-proxy';
rethinkDBProxy({ port: 8125 });

r.connect({ port: 8125 }).then((conn) => {
  r.table('users').delete('array').run(conn)
    .catch((err) => {
      // We get an error!
      console.log(err); // RqlClientError: Cannot execute query. "DELETE" query not allowed
    });
});
```
## Running rethinkdb-proxy

#### CLI

rethinkdb-proxy comes with a CLI out-of-the box:

```
rethinkdb-proxy --port 8125 --allow-insert
```

#### Module

You can also import rethinkdb-proxy into Node.js:

```
import rethinkDBProxy from 'rethinkdb-proxy';
rethinkDBProxy({ port: 8125, allowInsert: true });
```
## Options

| Module Parameter   | CLI Parameter           | Default     | Description                                                                    | API Reference |
|--------------------|-------------------------|-------------|--------------------------------------------------------------------------------|---------------|
| `port`             | `--port`                | `8125`      | Port in which to listen for driver connections                                 |               |
| `rdbHost`          | `--rdb-port`            | `28015`     | Client Port in which RethinkDB is running                                      |               |
| `rdbPort`          | `--rdb-host`            | `localhost` | Host in which RethinkDB is running                                             |               |
| `dbs`              | `--dbs`                 | `[ ]`       | Database to allow acces to. All except `rethinkdb` allowed by default.         |               |
| `allowSysDbAccess` | `--allow-sys-db-access` | `false`     | Allow access to the `rethinkdb` database                                       |               |
| `tables`           | `--tables`              | `[ ]`       | Tables to allow acces to. Tables must include their datatabase `db.table`      |               |
| `allowWrites`      | `--allow-writes`        | `false`     | Allow all operations that write to the database (`insert`, `update`, `delete`) |               |
| `allowInsert`      | `--allow-insert`        | `false`     | Allow `insert` queries                                                         |               |
| `allowUpdate`      | `--allow-update`        | `false`     | Allow `update` queries                                                         |               |
| `allowDelete`      | `--allow-delete`        | `false`     | Allow `delete` queries                                                         |               |
| `allowReplace`     | `--allow-replace`       | `false`     | Allow `replace` queries                                                        |               |
| `allowDbCreate`    | `--allow-db-create`     | `false`     | Allow `dbCreate` queries                                                       |               |
| `allowDbDrop`      | `--allow-db-drop`       | `false`     | Allow `dbDrop` queries                                                         |               |
| `allowTableCreate` | `--allow-table-create`  | `false`     | Allow `tableCreate` queries                                                    |               |
| `allowTableDrop`   | `--allow-table-drop`    | `false`     | Allow `tableDrop` queries                                                      |               |
| `allowIndexes`     | `--allow-indexes`       | `false`     | Allow all operations on indexes (`indexCreate`, `indexDrop`, `indexRename`)    |               |
| `allowIndexCreate` | `--allow-index-create`  | `false`     | Allow `indexCreate` queries                                                    |               |
| `allowIndexDrop`   | `--allow-index-drop`    | `false`     | Allow `indexDrop` queries                                                      |               |
| `allowIndexRename` | `--allow-index-rename`  | `false`     | Allow `indexRename` queries                                                    |               |
| `allowReconfigure` | `--allow-reconfigure`   | `false`     | Allow `reconfigure` queries                                                    |               |
| `allowRebalance`   | `--allow-rebalance`     | `false`     | Allow `rebalance` queries                                                      |               |
| `allowHttp`        | `--allow-http`          | `false`     | Allow queries with the `http` term                                             |               |
| `allowJavascript`  | `--allow-javascript`    | `false`     | Allow queries with the `js` term                                               |               |
