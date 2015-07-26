/*jshint esnext:true */
import net from 'net';
import _ from 'lodash';
import BufferParser from './buffer-parser';
import protoDef from '../driver/proto-def';

export default (opts, cb) => {
   // Define Options and defaults
  opts = Object.assign({
    port: 8125,
    allowWrites: false, // Allow insert, update, delete
    allowInsert: false,
    allowUpdate: false,
    allowReplace: false,
    allowDelete: false,
    allowDbCreate: false,
    allowDbDrop: false,
    allowTableCreate: false,
    allowTableDrop: false,
    allowIndexes: false, // Allow indexCreate, indexDrop, indexRename
    allowIndexCreate: false,
    allowIndexDrop: false,
    allowIndexRename: false,
    allowReconfigure: false,
    allowRebalance: false,
    allowHttp: false,
    allowJavascript: false
  }, opts);

  // By default, don't allow any of these terms
  let unallowedTerms = [
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

  let toUpperCaseSnakeCase = (str) => {
    return str
      .replace(/(^[A-Z])/g, ($1) => { return $1.toLowerCase(); })
      .replace(/([A-Z])/g, ($1) => { return "_"+$1.toUpperCase(); })
      .toUpperCase();
  };
  let allowTerm = (termName) => {
    if (unallowedTerms.includes(termName)) {
      unallowedTerms.splice(unallowedTerms.indexOf(termName), 1);
    }
  };
  // Allow all terms specified by user (single terms)
  for(let key in opts) {
    if (opts.hasOwnProperty(key)) {
      if (opts[key] === true && key.substring(0, 5) === 'allow') {
        let termName = toUpperCaseSnakeCase(key.substring(5));
        allowTerm(termName);
      }
    }
  }
  // Allow all terms specified (multiple terms)
  if (opts.allowWrites) {
    allowTerm('INSERT');
    allowTerm('UPDATE');
    allowTerm('DELETE');
  }
  if (opts.allowIndexes) {
    allowTerm('INDEX_CREATE');
    allowTerm('INDEX_DROP');
    allowTerm('INDEX_RENAME');
  }

  let server = net.createServer((clientSocket) => { //'connection' listener
    if (server.__connections === undefined) server.__connections = [];
    server.__connections.push(clientSocket);

    clientSocket.connected = false;
    let parser = new BufferParser();
    let serverSocket = net.connect(28015, 'localhost');

    /*!
     * Functions
     */
    let makeSendResponse = (socket) => {
      return (response, token) => {
        let tokenBuffer = new Buffer(8);
        tokenBuffer.writeUInt32LE(token & 0xFFFFFFFF, 0);
        tokenBuffer.writeUInt32LE(Math.floor(token / 0xFFFFFFFF), 4);
        let responseBuffer = new Buffer(JSON.stringify(response));
        let lengthBuffer = new Buffer(4);
        lengthBuffer.writeUInt32LE(responseBuffer.length, 0);
        if (socket.destroyed) return;
        socket.write(tokenBuffer);
        socket.write(lengthBuffer);
        socket.write(responseBuffer);
      };
    };
    let sendResponseToServer = makeSendResponse(serverSocket);
    let sendResponseToClient = makeSendResponse(clientSocket);
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

    serverSocket.on('data', (buff) => {
      if (buff.toString() === 'SUCCESS') clientSocket.connected = true;
      // NOTE: The socket might try to write something even if the connection
      // is closed
      if (clientSocket.destroyed) return;
      clientSocket.write(buff);
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
      serverSocket.write(token);
    });

    parser.on('query', (query, token) => {
      let termsFound = findTerms(unallowedTerms, query);
      if (termsFound.length > 0) {
        // This shouldn't throw an error, but rather, it should
        // send the error through the TCP connection
        let response = {
          t: protoDef.Response.ResponseType.CLIENT_ERROR,
          b: [],
          n: [],
          r: ['Cannot execute query. "' + termsFound + '" query not allowed.']
        };
        sendResponseToClient(response, token);
      }
      sendResponseToServer(query, token);
    });

    clientSocket.on('data', parser.append.bind(parser));
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

