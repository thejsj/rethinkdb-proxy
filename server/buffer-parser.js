/*jshint esnext:true */
const _listeners_ = Symbol('listeners');
const _queue_ = Symbol('queue');

const BufferParser = class BufferParser {

  constructor () {
    this[_queue_] = new Buffer(0);
    this[_listeners_] = {};
    this.protoVersion = null;
    this.authKeyLength = null;
    this.authKey = null;
    this.protoProtocol = null;
  }

  append (buff) {
    if (buff !== undefined) {
      this[_queue_] = Buffer.concat([buff, buff]);
    }
    if (this.protoVersion === null) {
      if (Buffer.byteLength(this[_queue_]) >= 4) {
        this.protoVersion = this[_queue_].slice(0, 4).readUInt32LE();
        this[_queue_] = this[_queue_].slice(4);
        // Call code again to ensure we don't have the authKey
        this.append();
      }
    } else if (this.authKeyLength === null) {
      if (Buffer.byteLength(this[_queue_] >= 4)) {
        this.authKeyLength = this[_queue_].slice(0, 4).readUInt32LE();
        this[_queue_] = this[_queue_].slice(4);
        // Call code again to ensure we don't have the authKey
        this.append();
      }
    } else if (this.authKey === null) {
      if (Buffer.byteLength(this[_queue_] >= this.authKeyLength)) {
        this.authKey = this[_queue_].slice(0, this.authKeyLength).toString('ascii');
        this[_queue_] = this[_queue_].slice(this.authKeyLength);
        // Call code again to ensure we don't have the authKey
        this.append();
      }
    } else if (this.protoProtocol === null) {
      if (Buffer.byteLength(this[_queue_] >= 4)) {
        this.protoProtocol = this[_queue_].slice(0, 4).readUInt32LE();
        this[_queue_] = this[_queue_].slice(4);
        // Call code again to ensure we don't have the authKey
        this.append();
        this.fireEvent('connect', this.protoVersion, this.authKey, this.protoProtocol);
      }
    } else {
      this.parseQuery();
    }
  }

  fireEvent (eventName, ...data) {
    if (this[_listeners_][eventName] !== undefined) {
      this[_listeners_][eventName].forEach((func) => {
        func.apply(null, data);
      });
    }
  }

  parseQuery () {
    let splitString = this[_queue_].toString().split('');
    let openBrackets = 0;
    let foundBracket = false;
    for (let i = 0; i < splitString.length; i += 1) {
      if (splitString[i] === '[') {
        openBrackets += 1;
        foundBracket = true;
      }
      if (splitString[i] === ']') {
        openBrackets -= 1;
      }
      if (openBrackets === 0 && foundBracket) {
        let token = this[_queue_].slice(0, 8).readUInt32LE();
        let byteLength = this[_queue_].slice(8, 12).readUInt32LE();
        let query = this[_queue_].slice(12, i + 1);
        if (Buffer.byteLength(query) === byteLength) {
          let json = JSON.parse(query.toString());
          this.fireEvent('query', json, token);
        }
        if (i + 1 >= splitString.length) this[_queue_] = new Buffer(splitString.slice(i + 1));
        else this[_queue_] = new Buffer(0);
        break;
      }
    }
  }

  on (eventName, func) {
    if (this[_listeners_][eventName] === undefined) {
      this[_listeners_][eventName] = [];
    }
    this[_listeners_][eventName].push(func);
  }

};

export default BufferParser;
