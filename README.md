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

| Module Parameter   | CLI Parameter           | Default     |
|--------------------|-------------------------|-------------|
| `port`             | `--port`                | `8125`      |
| `rdbHost`          | `--rdb-port`            | `28015`     |
| `rdbPort`          | `--rdb-host`            | `localhost` |
| `dbs`              | `--dbs`                 | `[ ]`       |
| `allowSysDbAccess` | `--allow-sys-db-access` | `false`     |
| `tables`           | `--tables`              | `[ ]`       |
| `allowWrites`      | `--allow-writes`        | `false`     |
| `allowInsert`      | `--allow-insert`        | `false`     |
| `allowUpdate`      | `--allow-update`        | `false`     |
| `allowDelete`      | `--allow-delete`        | `false`     |
| `allowReplace`     | `--allow-replace`       | `false`     |
| `allowDbCreate`    | `--allow-db-create`     | `false`     |
| `allowDbDrop`      | `--allow-db-drop`       | `false`     |
| `allowTableCreate` | `--allow-table-create`  | `false`     |
| `allowTableDrop`   | `--allow-table-drop`    | `false`     |
| `allowIndexes`     | `--allow-indexes`       | `false`     |
| `allowIndexCreate` | `--allow-index-create`  | `false`     |
| `allowIndexDrop`   | `--allow-index-drop`    | `false`     |
| `allowIndexRename` | `--allow-index-rename`  | `false`     |
| `allowReconfigure` | `--allow-reconfigure`   | `false`     |
| `allowRebalance`   | `--allow-rebalance`     | `false`     |
| `allowHttp`        | `--allow-http`          | `false`     |
| `allowJavascript`  | `--allow-javascript`    | `false`     |


| Module Parameter   | CLI Parameter           | Default     | API Reference |
|--------------------|-------------------------|-------------|---------------|
| `port`             | `--port`                | `8125`      |               |

Port in which to listen for driver connections

| Module Parameter   | CLI Parameter           | Default     | API Reference                                                                                        |
|--------------------|-------------------------|-------------|------------------------------------------------------------------------------------------------------|
| `rdbHost`          | `--rdb-port`            | `28015`     | [http://www.rethinkdb.com/api/javascript/connect/](http://www.rethinkdb.com/api/javascript/connect/) |

Client Port in which RethinkDB is running

| Module Parameter   | CLI Parameter           | Default     | API Reference                                                                                        |
|--------------------|-------------------------|-------------|------------------------------------------------------------------------------------------------------|
| `rdbPort`          | `--rdb-host`            | `localhost` | [http://www.rethinkdb.com/api/javascript/connect/](http://www.rethinkdb.com/api/javascript/connect/) |

Host in which RethinkDB is running

| Module Parameter   | CLI Parameter           | Default     | API Reference |
|--------------------|-------------------------|-------------|---------------|
| `dbs`              | `--dbs`                 | `[ ]`       |               |

Database to allow access to. All except `rethinkdb` allowed by default.


| Module Parameter   | CLI Parameter           | Default     | API Reference |
|--------------------|-------------------------|-------------|---------------|
| `allowSysDbAccess` | `--allow-sys-db-access` | `false`     |               |

Allow access to the `rethinkdb` database


| Module Parameter   | CLI Parameter           | Default     | API Reference |
|--------------------|-------------------------|-------------|---------------|
| `tables`           | `--tables`              | `[ ]`       |               |

Tables to allow acces to. Tables must include their datatabase `db.table`      

| Module Parameter   | CLI Parameter           | Default     | API Reference |
|--------------------|-------------------------|-------------|---------------|
| `allowWrites`      | `--allow-writes`        | `false`     |               |

Allow all operations that write to the database (`insert`, `update`, `delete`) 

| Module Parameter   | CLI Parameter           | Default     | API Reference                                                                                      |
|--------------------|-------------------------|-------------|----------------------------------------------------------------------------------------------------|
| `allowInsert`      | `--allow-insert`        | `false`     | [http://www.rethinkdb.com/api/javascript/insert/](http://www.rethinkdb.com/api/javascript/insert/) |

Allow `insert` queries.

| Module Parameter   | CLI Parameter           | Default     | API Reference                                                                                      |
|--------------------|-------------------------|-------------|----------------------------------------------------------------------------------------------------|
| `allowUpdate`      | `--allow-update`        | `false`     | [http://www.rethinkdb.com/api/javascript/update/](http://www.rethinkdb.com/api/javascript/update/) |               |

Allow `update` queries.


| Module Parameter   | CLI Parameter           | Default     | API Reference                                                                                      |
|--------------------|-------------------------|-------------|----------------------------------------------------------------------------------------------------|
| `allowDelete`      | `--allow-delete`        | `false`     | [http://www.rethinkdb.com/api/javascript/delete/](http://www.rethinkdb.com/api/javascript/delete/) |

Allow `delete` queries.

| Module Parameter   | CLI Parameter           | Default     | API Reference                                                                                      |
|--------------------|-------------------------|-------------|----------------------------------------------------------------------------------------------------|
| `allowReplace`     | `--allow-replace`       | `false`     | [http://www.rethinkdb.com/api/javascript/delete/](http://www.rethinkdb.com/api/javascript/delete/) |

Allow `replace` queries.

| Module Parameter   | CLI Parameter           | Default     | API Reference                                                                                            |
|--------------------|-------------------------|-------------|----------------------------------------------------------------------------------------------------------|
| `allowDbCreate`    | `--allow-db-create`     | `false`     | [http://www.rethinkdb.com/api/javascript/db_create/](http://www.rethinkdb.com/api/javascript/db_create/) |

Allow `dbCreate` queries

| Module Parameter   | CLI Parameter           | Default     | API Reference                                                                                        |
|--------------------|-------------------------|-------------|------------------------------------------------------------------------------------------------------|
| `allowDbDrop`      | `--allow-db-drop`       | `false`     | [http://www.rethinkdb.com/api/javascript/db_drop/](http://www.rethinkdb.com/api/javascript/db_drop/) |

Allow `dbDrop` queries

| Module Parameter   | CLI Parameter           | Default     | API Reference                                                                                                  |
|--------------------|-------------------------|-------------|----------------------------------------------------------------------------------------------------------------|
| `allowTableCreate` | `--allow-table-create`  | `false`     | [http://www.rethinkdb.com/api/javascript/table_create/](http://www.rethinkdb.com/api/javascript/table_create/) |

Allow `tableCreate` queries.

| Module Parameter   | CLI Parameter           | Default     | API Reference                                                                                               |
|--------------------|-------------------------|-------------|-------------------------------------------------------------------------------------------------------------|
| `allowTableDrop`   | `--allow-table-drop`    | `false`     |  [http://www.rethinkdb.com/api/javascript/table_drop/](http://www.rethinkdb.com/api/javascript/table_drop/) |

Allow `tableDrop` queries.

| Module Parameter   | CLI Parameter           | Default     | API Reference                                                                                      |
|--------------------|-------------------------|-------------|----------------------------------------------------------------------------------------------------|
| `allowIndexes`     | `--allow-indexes`       | `false`     | |               |

Allow all operations on indexes (`indexCreate`, `indexDrop`, `indexRename`).

| Module Parameter   | CLI Parameter           | Default     | API Reference                                                                                      |
|--------------------|-------------------------|-------------|----------------------------------------------------------------------------------------------------|
| `allowIndexCreate` | `--allow-index-create`  | `false`     | |               |

Allow `indexCreate` queries.

| Module Parameter   | CLI Parameter           | Default     | API Reference                                                                                      |
|--------------------|-------------------------|-------------|----------------------------------------------------------------------------------------------------|
| `allowIndexDrop`   | `--allow-index-drop`    | `false`     | |               |

Allow `indexDrop` queries.

| Module Parameter   | CLI Parameter           | Default     | API Reference                                                                                      |
|--------------------|-------------------------|-------------|----------------------------------------------------------------------------------------------------|
| `allowIndexRename` | `--allow-index-rename`  | `false`     | |               |

Allow `indexRename` queries.

| Module Parameter   | CLI Parameter           | Default     | API Reference                                                                                      |
|--------------------|-------------------------|-------------|----------------------------------------------------------------------------------------------------|
| `allowReconfigure` | `--allow-reconfigure`   | `false`     | |               |

Allow `reconfigure` queries.

| Module Parameter   | CLI Parameter           | Default     | API Reference                                                                                      |
|--------------------|-------------------------|-------------|----------------------------------------------------------------------------------------------------|
| `allowRebalance`   | `--allow-rebalance`     | `false`     | |               |

Allow `rebalance` queries.

| Module Parameter   | CLI Parameter           | Default     | API Reference                                                                                      |
|--------------------|-------------------------|-------------|----------------------------------------------------------------------------------------------------|
| `allowHttp`        | `--allow-http`          | `false`     | |               |

Allow queries with the `http` term.

| Module Parameter   | CLI Parameter           | Default     | API Reference                                                                                      |
|--------------------|-------------------------|-------------|----------------------------------------------------------------------------------------------------|
| `allowJavascript`  | `--allow-javascript`    | `false`     | |               |

Allow queries with the `js` term.

