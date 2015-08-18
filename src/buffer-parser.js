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
      this[_queue_] = Buffer.concat([this[_queue_], buff]);
    }
    if (this.protoVersion === null) {
      if (Buffer.byteLength(this[_queue_]) >= 4) {
        this.protoVersion = this[_queue_].slice(0, 4).readUInt32LE();
        this[_queue_] = this[_queue_].slice(4);
        // Call code again to ensure we don't have the authKey
        this.append();
      }
    } else if (this.authKeyLength === null) {
      if (Buffer.byteLength(this[_queue_]) >= 4) {
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
      if (Buffer.byteLength(this[_queue_]) >= 4) {
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
    /*!
     * Assumptions
     * 1. All clients have their own instance of BufferParser
     * 2. TCP connections send messages in order
     * 3. Because messages are sent in order by the client through a TCP connection,
     * we can assume that all packets are tokens followed by query bytelenghts
     * followed by queries
     */
    let newQueue = null;
    let _prevQuery = null;
    /*!
     * Make sure we have all three components necessary to parse the query:
     * token, byteLength, and query
     */
    if (Buffer.byteLength(this[_queue_]) <= 12) return;
    let token = this[_queue_].slice(0, 8).readUInt32LE();
    let byteLength = this[_queue_].slice(8, 12).readUInt32LE();
    let query = this[_queue_].slice(12, byteLength + 12);
    newQueue = this[_queue_].slice(byteLength + 12);
    try {
      // Simplest way to handle check if input is valid JSON
      let json = JSON.parse(query.toString());
      this.fireEvent('query', json, token);
    } catch (err) {
      // I think the problem has something to do with the fact that I'm adding a
      // comma somehwere ....
      this.fireEvent('error', token);
    }
    this[_queue_] = new Buffer(0);
    if (newQueue !== null && newQueue.length > 0 && Buffer.byteLength(newQueue) >= 8){
      let token = newQueue.slice(0, 8).readUInt32LE();
      if (parseInt(token) === +token) {
        this.append(newQueue);
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
