/*jshint esnext:true */

const BufferParser = class BufferParser {

  constructor () {
    this.queue = new Buffer(0);
  }

  append (buff) {
    this.queue = Buffer.concat([this.queue, buff]);
    let splitString = this.queue.toString().split('');
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
        let token = this.queue.slice(0, 8).readUInt32LE();
        let byteLength = this.queue.slice(8, 12).readUInt32LE();
        let query = this.queue.slice(12, i + 1);
        console.log('Token', token, 'BL', byteLength);
        if (Buffer.byteLength(query) === byteLength) {
          console.log(query.toString());
          try {
            console.log(JSON.parse(query.toString()));
          } catch (err) {
            console.log('fails');
          }
        }
        if (i + 1 >= splitString.length) this.queue = new Buffer(splitString.slice(i + 1));
        else this.queue = new Buffer(0);
        break;
      }
    }

  }

};

export default BufferParser;
