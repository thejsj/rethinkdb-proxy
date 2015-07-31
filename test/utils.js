/*jshint esnext:true */
import Promise from 'bluebird';
import r from 'rethinkdb';
import Server from 'reqlite';

export function makeExecuteQuery (dbName, proxyPort) {
  return function (query) {
    return Promise.resolve()
        .then(() => {
          return [r.connect({ db: dbName }), r.connect({ port: proxyPort, db: dbName })];
        })
        .spread((connA, connB) => {
          return Promise.all([query.run(connA), query.run(connB)])
            .spread((resultA, resultB) => {
              if (typeof resultA.toArray === 'function' && typeof resultA.each === 'function') {
                return Promise.all([
                  resultA.toArray(),
                  resultB.toArray()
                ]);
              }
              return [resultA, resultB];
            })
            .finally(function () {
              return Promise.all([connA.close(), connB.close()]);
            });
        });
  };
}

export function makeExecuteProxyQuery (dbName, proxyPort) {
  return function (query) {
    return Promise.resolve()
        .then(() => {
          return r.connect({ port: proxyPort, db: dbName });
        })
        .then((conn) => {
          return query.run(conn)
            .then((result) => {
              if (typeof result.toArray === 'function' && typeof result.each === 'function') {
                return result.toArray();
              }
              return result;
            })
            .finally(function () {
              return conn.close();
            });
        });
  };
}

export function makeAssertQuery (executeQuery) {
  return function (query) {
    return executeQuery(query)
      .spread((resultA, resultB) => {
        return resultA.should.eql(resultB);
      });
  };
}

export function makeCreateDatabase (dbName, tableName) {
  return function (done) {
    return r.connect().then((conn) => {
      return Promise.resolve()
        .then(() => {
          return r.dbCreate(dbName).run(conn)
            .catch((err) => { });
        })
        .then(() => {
          return r.db(dbName).tableCreate(tableName).run(conn)
            .catch((err) => { });
        });
    });
  };
}

export function makeDropDatabase (dbName) {
  return function () {
    return r.connect().then((conn) => {
      return r.dbDrop(dbName).run(conn)
        .finally(() => conn.close());
    });
  };
}

