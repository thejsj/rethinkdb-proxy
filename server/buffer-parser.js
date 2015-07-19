/*jshint esnext:true */

const _listeners_ = Symbol('listeners');
const _queue_ = Symbol('queue');

const BufferParser = class BufferParser {

  constructor () {
    this[_queue_] = new Buffer(0);
    this[_listeners_] = {};
  }

  append (buff) {
    this[_queue_] = Buffer.concat([this[_queue_], buff]);
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
          if (this[_listeners_].query !== undefined) {
            this[_listeners_].query.forEach((func) => {
              func(json, token);
            });
          }
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
