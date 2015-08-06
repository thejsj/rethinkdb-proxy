import BufferParser from '../server/buffer-parser';
import protoDef from '../node_modules/rethinkdb/proto-def'
import 'should';

describe('Buffer Parser', () => {

  let parser;
  let parseQuery = (...args) => {
    let result = [];
    let cb = args.pop();
    parser.on('query', (query) => {
      result.push(query);
    });
    let count = 0;
    for(let value of args.values()) {
      let token = count++;
      let tokenBuffer = new Buffer(8);
      tokenBuffer.writeUInt32LE(token & 0xFFFFFFFF, 0);
      tokenBuffer.writeUInt32LE(Math.floor(token / 0xFFFFFFFF), 4);
      let byteLengthBuffer = new Buffer(4);
      let queryBuffer = new Buffer(JSON.stringify(value));
      byteLengthBuffer.writeUInt32LE(queryBuffer.length, 0);
      parser.append(Buffer.concat([tokenBuffer, byteLengthBuffer, queryBuffer]));
    }
    cb(result);
  };

  beforeEach(() => {
    parser = new BufferParser();
    let version = new Buffer(4);
    version.writeUInt32LE(protoDef.VersionDummy.Version.VO_4, 0);
    let auth_buffer = new Buffer('', 'ascii');
    let auth_length = new Buffer(4);
    auth_length.writeUInt32LE(auth_buffer.length, 0);
    let protocol = new Buffer(4);
    protocol.writeUInt32LE(protoDef.VersionDummy.Protocol.JSON, 0);
    var token = Buffer.concat([version, auth_length, auth_buffer, protocol]);
    parser.append(token);
  });

  it('should correctly parse a single buffer', () => {
    let value = [[1]];
    parseQuery(value, (result) => {
      result[0].should.eql(value);
    });
  });

  it('should correctly parse a multiples buffers', () => {
    let value0 = [[1]];
    let value1 = [1, [3, [4, [3]]]];
    let value2 = [1, [3, [4, [3]]]];
    parseQuery(value0, value1, value2, (result) => {
      result[0].should.eql(value0);
      result[1].should.eql(value1);
      result[2].should.eql(value2);
    });
  });



});
