/*jshint esnext:true */
import r from 'rethinkdb';
import Promise from 'bluebird';
import server from '../server';
import should from 'should';

let proxyPort = 8125;

let assertQuery = ((query) => {
  return Promise.resolve()
      .then(() => {
        return [r.connect(), r.connect({ port: proxyPort })];
      })
      .spread((connA, connB) => {
        return [query.run(connA), query.run(connB)];
      })
      .spread((resultA, resultB) => {
        resultA.should.eql(resultB);
        return;
      });
});

describe('Read Queries', () => {

  before((done) => {
    server(proxyPort, done);
  });

  it('should return an `r.expr` successfully', (done) => {
    assertQuery(r.expr([1, 2, 3]))
     .then(done);
  });

  it('should return the same list of databases', (done) => {
    assertQuery(r.dbList())
     .then(done);
  });
});
