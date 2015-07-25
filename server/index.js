/*jshint esnext:true */
import net from 'net';
import _ from 'lodash';
import BufferParser from './buffer-parser';
import protoDef from '../driver/proto-def';

export default (opts, cb) => {
  let server = net.createServer((c) => { //'connection' listener
    if (server.__connections === undefined) server.__connections = [];
    server.__connections.push(c);

    let parser = new BufferParser();
    opts = Object.assign({
      port: 8125,
      readOnly: false
    }, opts);

    c.connected = false;
    c.clientSocket = net.connect(28015, 'localhost');

    c.clientSocket.on('data', (buff) => {
      if (buff.toString() === 'SUCCESS') c.connected = true;
      // NOTE: The socket might try to write something even if the connection
      // is close
      if (c.destroyed) return;
      c.write(buff);
    });

    parser.on('connect', (version, authKey, protoProtocol) => {
      let versionBuffer = new Buffer(4);
      versionBuffer.writeUInt32LE(version, 0);
      let authBuffer = new Buffer(authKey, 'ascii');
      let authLengthBuffer = new Buffer(4);
      authLengthBuffer.writeUInt32LE(authBuffer.length, 0);
      let protocolBuffer = new Buffer(4);
      protocolBuffer.writeUInt32LE(protoProtocol, 0);
      let token = Buffer.concat([versionBuffer, authLengthBuffer, authBuffer, protocolBuffer]);
      c.clientSocket.write(token);
    });

    parser.on('query', (query, token) => {
      if (opts.readOnly) {
        let invalidTerms = [
          "INSERT",
          "UPDATE",
          "REPLACE",
          "DELETE",
          "DB_CREATE",
          "DB_DROP",
          "TABLE_CREATE",
          "TABLE_DROP",
          "INDEX_CREATE",
          "INDEX_DROP",
          "INDEX_RENAME",
          "RECONFIGURE",
          "REBALANCE",
          "HTTP",
          "JAVASCRIPT"
        ];
        let pl = (level) => { return ' '.repeat(level * 4); };
        let isRQLQuery = (query) => {
          // Duck typing a query...
          if (!Array.isArray(query)) return false;
          if (query.length < 2 || query.length > 3) return false;
          if (!Number.isInteger(query[0])) return false;
          if (
            query[2] !== undefined &&
            typeof query[2] !== 'object' &&
            !Array.isArray(query[2])
          ) {
            return false;
          }
          return true;
        };
        let findTerms = (terms, query) => {
          if (!isRQLQuery(query)) {
            if (Array.isArray(query)) {
              return _.flatten(query.map(findTerms.bind(null, terms))).filter(x => x);
            }
            return [];
          }
          let command = query[0], args = query[1], opts = query[2];
          for (let termName of terms.values()) {
            if(protoDef.Term.TermType[termName] === command) return termName;
          }
          if (command === protoDef.Term.TermType.MAKE_ARRAY) {
            return _.flatten(query[1].map(findTerms.bind(null, terms))).filter(x => x);
          }
          return _.flatten(query.map(findTerms.bind(null, terms))).filter(x => x);
        };
        let termsFound = findTerms(invalidTerms, query);
        if (termsFound.length > 0) {
          // This shouldn't throw an error, but rather, it should
          // send the error through the TCP connection
          let tokenBuffer = new Buffer(8);
          tokenBuffer.writeUInt32LE(token & 0xFFFFFFFF, 0);
          tokenBuffer.writeUInt32LE(Math.floor(token / 0xFFFFFFFF), 4);
          let response = {
            t: protoDef.Response.ResponseType.CLIENT_ERROR,
            b: [],
            n: [],
            r: ['Cannot execute query. "' + termsFound + '" query not allowed.']
          };
          let responseBuffer = new Buffer(JSON.stringify(response));
          let lengthBuffer = new Buffer(4);
          lengthBuffer.writeUInt32LE(responseBuffer.length, 0);
          if (c.destroyed) return;
          c.write(tokenBuffer);
          c.write(lengthBuffer);
          c.write(responseBuffer);
        }
      }
      // Write Token
      let tokenBuffer = new Buffer(8);
      tokenBuffer.writeUInt32LE(token & 0xFFFFFFFF, 0);
      tokenBuffer.writeUInt32LE(Math.floor(token / 0xFFFFFFFF), 4);
      c.clientSocket.write(tokenBuffer);
      let queryBuffer = new Buffer(JSON.stringify(query));
      let lengthBuffer = new Buffer(4);
      lengthBuffer.writeUInt32LE(queryBuffer.length, 0);
      c.clientSocket.write(lengthBuffer);
      c.clientSocket.write(queryBuffer);
    });

    c.on('data', parser.append.bind(parser));
  });

  server.listen(opts.port, cb);

  return {
    'close': () => {
      return new Promise(function (resolve, reject) {
        server.close(resolve);
        setTimeout(function () {
          server.__connections.forEach(function (conn) {
            conn.destroy();
          });
        }, 100);
      });
    }
  };
};

