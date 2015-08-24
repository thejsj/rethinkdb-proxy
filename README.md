# RethinkDB Proxy

[![Build Status](https://travis-ci.org/thejsj/rethinkdb-proxy.svg?branch=master)](https://travis-ci.org/thejsj/rethinkdb-proxy)
[![npm version](https://badge.fury.io/js/rethinkdb-proxy.svg)](http://badge.fury.io/js/rethinkdb-proxy)

*Reverse proxy for RethinkDB*

Make your RethinkDB publicly accessible through limiting what kind of queries can be executed on your RethinkDB database.

## Introduction by Example

First, start the proxy.

```bash
$ rethinkdb-proxy --port 8125
```
Using the proxy, getting all users in the `users` table is allowed.

```javascript
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

## Try it!

You can try out rethinkdb-proxy by connecting to a publicly available proxy at `rethinkdb-proxy.thejsj.com:8125`. 
This database (named `test`) has two tables: `countries` and `cities`. You can 
run queries against it to see how `rethindkb-proxy` works.

**JavasScript:**

```javascript
import r from 'rethinkdb';
r.connect({ host: 'rethinkdb-proxy.thejsj.com', port: 8125 })
 .then(function (conn) {
   r.table('countries').coerceTo('array').run(conn);
 });
```

**Python:**

```python
import rethinkdb as r
conn = r.connect(host="rethinkdb-proxy.thejsj.com", port=8125)
r.table('countries').coerce_to('array').run(conn)
```

## Running rethinkdb-proxy

#### CLI

rethinkdb-proxy comes with a CLI out-of-the box:

```javascript
rethinkdb-proxy --port 8125 
```

#### Module

You can also import rethinkdb-proxy into Node.js:

```javascript
import rethinkDBProxy from 'rethinkdb-proxy';
rethinkDBProxy({ port: 8125, allowInsert: true });
```

## Options

 - [`port`](#port)
 - [`rdbHost`](#rdbHost)
 - [`rdbPort`](#rdbPort)
 - [`dbs`](#dbs)
 - [`allowSysDbAccess`](#allowSysDbAccess)
 - [`tables`](#tables)
 - [`allowWrites`](#allowWrites)
 - [`allowInsert`](#allowInsert)
 - [`allowUpdate`](#allowUpdate)
 - [`allowDelete`](#allowDelete)
 - [`allowReplace`](#allowReplace)
 - [`allowDbCreate`](#allowDbCreate)
 - [`allowDbDrop`](#allowDbDrop)
 - [`allowTableCreate`](#allowTableCreate)
 - [`allowTableDrop`](#allowTableDrop)
 - [`allowIndexes`](#allowIndexes)
 - [`allowIndexCreate`](#allowIndexCreate)
 - [`allowIndexDrop`](#allowIndexDrop)
 - [`allowIndexRename`](#allowIndexRename)
 - [`allowReconfigure`](#allowReconfigure)
 - [`allowRebalance`](#allowRebalance)
 - [`allowHttp`](#allowHttp)
 - [`allowJavascript`](#allowJavascript)

### Port <a name='port'></a>

| Module Parameter   | CLI Parameter           | Default     | API Reference |
|--------------------|-------------------------|-------------|---------------|
| `port`             | `--port`                | `8125`      |               |

Port in which to listen for driver connections. You should point your driver to this port.

### RethinkDB Host <a name='rdbHost'></a>

| Module Parameter   | CLI Parameter           | Default     | API Reference                                                                                        |
|--------------------|-------------------------|-------------|-------------------------------------------------------------|
| `rdbHost`          | `--rdb-host`            | `localhost`     | [connect](http://www.rethinkdb.com/api/javascript/connect/) |

Host in which RethinkDB is running.

### RethinkDB Port <a name='rdbPort'></a>

| Module Parameter   | CLI Parameter           | Default     | API Reference                                                                                        |
|--------------------|-------------------------|-------------|--------------------------------------------------------------|
| `rdbPort`          | `--rdb-host`            | `localhost` | [connect](http://www.rethinkdb.com/api/javascript/connect/) |

Host in which RethinkDB is running.

### Databases <a name='dbs'></a>

| Module Parameter   | CLI Parameter           | Default     | API Reference |
|--------------------|-------------------------|-------------|---------------|
| `dbs`              | `--dbs`                 | `[ ]`       |               |

Database to allow access to. By default, all database are allowed except `rethinkdb`.

### Allow System Database Access <a name='allowSysDbAccess'></a>

| Module Parameter   | CLI Parameter           | Default     | API Reference |
|--------------------|-------------------------|-------------|---------------|
| `allowSysDbAccess` | `--allow-sys-db-access` | `false`     |               |

Allow access to the `rethinkdb` database. This is not allowed by default, because
access to this database allows to delete all other data.

### Tables <a name='tables'></a>

| Module Parameter   | CLI Parameter           | Default     | API Reference |
|--------------------|-------------------------|-------------|---------------|
| `tables`           | `--tables`              | `[ ]`       |               |

Tables to allow access to. Tables must include their database `db.table`.

### Allow Writes <a name='allowWrites'></a>

| Module Parameter   | CLI Parameter           | Default     | API Reference |
|--------------------|-------------------------|-------------|---------------|
| `allowWrites`      | `--allow-writes`        | `false`     |               |

Allow all operations that write to the database (`insert`, `update`, `delete`).

### Allow `insert` <a name='allowInsert'></a>

| Module Parameter   | CLI Parameter           | Default     | API Reference                                             |
|--------------------|-------------------------|-------------|-----------------------------------------------------------|
| `allowInsert`      | `--allow-insert`        | `false`     | [insert](http://www.rethinkdb.com/api/javascript/insert/) |

Allow `insert` queries.

### Allow `update` <a name='allowUpdate'></a>

| Module Parameter   | CLI Parameter           | Default     | API Reference                                             |
|--------------------|-------------------------|-------------|-----------------------------------------------------------|
| `allowUpdate`      | `--allow-update`        | `false`     | [update](http://www.rethinkdb.com/api/javascript/update/) |

Allow `update` queries.

### Allow `delete` <a name='allowDelete'></a>

| Module Parameter   | CLI Parameter           | Default     | API Reference                                             |
|--------------------|-------------------------|-------------|-----------------------------------------------------------|
| `allowDelete`      | `--allow-delete`        | `false`     | [delete](http://www.rethinkdb.com/api/javascript/delete/) |

Allow `delete` queries.

### Allow `replace` <a name='allowReplace'></a>

| Module Parameter   | CLI Parameter           | Default     | API Reference                                              |
|--------------------|-------------------------|-------------|------------------------------------------------------------|
| `allowReplace`     | `--allow-replace`       | `false`     | [replace](http://www.rethinkdb.com/api/javascript/delete/) |

Allow `replace` queries.

### Allow `dbCreate` <a name='allowDbCreate'></a>

| Module Parameter   | CLI Parameter           | Default     | API Reference                                                  |
|--------------------|-------------------------|-------------|----------------------------------------------------------------|
| `allowDbCreate`    | `--allow-db-create`     | `false`     | [dbCreate](http://www.rethinkdb.com/api/javascript/db_create/) |

Allow `dbCreate` queries

### Allow `dbDrop` <a name='allowDbDrop'></a>

| Module Parameter   | CLI Parameter           | Default     | API Reference                                              |
|--------------------|-------------------------|-------------|------------------------------------------------------------|
| `allowDbDrop`      | `--allow-db-drop`       | `false`     | [dbDrop](http://www.rethinkdb.com/api/javascript/db_drop/) |

Allow `dbDrop` queries

### Allow `tableCreate` <a name='allowTableCreate'></a>

| Module Parameter   | CLI Parameter           | Default     | API Reference                                                        |
|--------------------|-------------------------|-------------|----------------------------------------------------------------------|
| `allowTableCreate` | `--allow-table-create`  | `false`     | [tableCreate](http://www.rethinkdb.com/api/javascript/table_create/) |

Allow `tableCreate` queries.

### Allow `tableDrop` <a name='allowTableDrop'></a>

| Module Parameter   | CLI Parameter           | Default     | API Reference                                                     |
|--------------------|-------------------------|-------------|-------------------------------------------------------------------|
| `allowTableDrop`   | `--allow-table-drop`    | `false`     | [tableDrop](http://www.rethinkdb.com/api/javascript/table_drop/)  |

Allow `tableDrop` queries.

### Allow Indexes <a name='allowIndexes'></a>

| Module Parameter   | CLI Parameter           | Default     | API Reference |
|--------------------|-------------------------|-------------|---------------|
| `allowIndexes`     | `--allow-indexes`       | `false`     |               |

Allow all operations on indexes (`indexCreate`, `indexDrop`, `indexRename`).

### Allow `indexCreate` <a name='allowIndexeCreate'></a>

| Module Parameter   | CLI Parameter           | Default     | API Reference                                                        |
|--------------------|-------------------------|-------------|----------------------------------------------------------------------|
| `allowIndexCreate` | `--allow-index-create`  | `false`     | [indexCreate](http://www.rethinkdb.com/api/javascript/index_create/) |

Allow `indexCreate` queries.

### Allow `indexDrop` <a name='allowIndexDrop'></a>

| Module Parameter   | CLI Parameter           | Default     | API Reference                                                    |
|--------------------|-------------------------|-------------|------------------------------------------------------------------|
| `allowIndexDrop`   | `--allow-index-drop`    | `false`     | [indexDrop](http://www.rethinkdb.com/api/javascript/index_drop/) |

Allow `indexDrop` queries.

### Allow `indexRename` <a name='allowIndexRename'></a>

| Module Parameter   | CLI Parameter           | Default     | API Reference                                                        |
|--------------------|-------------------------|-------------|----------------------------------------------------------------------|
| `allowIndexRename` | `--allow-index-rename`  | `false`     | [indexRename](http://www.rethinkdb.com/api/javascript/index_rename/) |

Allow `indexRename` queries.

### Allow `reconfigure` <a name='allowReconfigure'></a>

| Module Parameter   | CLI Parameter           | Default     | API Reference                                                       |
|--------------------|-------------------------|-------------|---------------------------------------------------------------------|
| `allowReconfigure` | `--allow-reconfigure`   | `false`     | [reconfigure](http://www.rethinkdb.com/api/javascript/reconfigure/) |

Allow `reconfigure` queries.

### Allow `rebalance` <a name='allowRebalance'></a>

| Module Parameter   | CLI Parameter           | Default     | API Reference                                                        |
|--------------------|-------------------------|-------------|----------------------------------------------------------------------|
| `allowRebalance`   | `--allow-rebalance`     | `false`     | [rebalance](http://www.rethinkdb.com/api/javascript/rebalance/)  |

Allow `rebalance` queries.

### Allow `http` <a name='allowHttp'></a>

| Module Parameter   | CLI Parameter           | Default     | API Reference                                         |
|--------------------|-------------------------|-------------|-------------------------------------------------------|
| `allowHttp`        | `--allow-http`          | `false`     | [http](http://www.rethinkdb.com/api/javascript/http/) |

Allow queries with the `http` term.

### Allow `js` <a name='allowJavascript'></a>

| Module Parameter   | CLI Parameter           | Default     | API Reference                                      |
|--------------------|-------------------------|-------------|----------------------------------------------------|
| `allowJavascript`  | `--allow-javascript`    | `false`     | [js](http://www.rethinkdb.com/api/javascript/js/)  |

Allow queries with the `js` term.

