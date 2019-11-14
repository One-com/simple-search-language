function SimpleSearchWriter(writer, options) {
  if (!(typeof writer === 'object' && writer)) {
    throw new Error('Missing writer');
  }

  this.writer = writer;
  this.stack = [];
  this.options = options || {};
}

SimpleSearchWriter.prototype._outputToken = function(token) {
  switch (token[0]) {
    case 'LITERAL':
      return this.writer.literal(token[1], token[2], this.options);
    case 'LIST':
      return this.writer.list(token.slice(1).map(this._outputToken, this));
    case 'OR':
      return this.writer.or(
        this._outputToken(token[1]),
        this._outputToken(token[2])
      );
    case 'NOT':
      return this.writer.not(this._outputToken(token[1]));
    default:
      throw new Error('Unsupported token: ' + token[0]);
  }
};

SimpleSearchWriter.prototype.write = function(rootToken) {
  if (rootToken[0].length === 1 && rootToken[0][0] === 'LIST') {
    // In the case of an empty search there will be a single
    // LIST token in the output with no arguments - special
    // case this and return an empty search.
    return '';
  }

  return this._outputToken(rootToken);
};

module.exports = SimpleSearchWriter;
