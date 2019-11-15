const unicodeRegExp = require('unicoderegexp');

var spliceCharacterClassRegExps = unicodeRegExp.spliceCharacterClassRegExps;
var rxOther = unicodeRegExp.other;
var rxSeparator = unicodeRegExp.separator;

var rxWord = new RegExp(
  '(' +
    spliceCharacterClassRegExps(/^/, /\(/, /\)/, rxOther, rxSeparator).source +
    '+)'
);

var rxVisibleNotQuote = new RegExp(
  '(' + spliceCharacterClassRegExps(/^/, /"/, rxOther).source + '+)'
);

var isReservedWord = str => ['OR'].includes(str);

function ParseSimpleSearch(writer, options) {
  const labels = options.labels;

  this.rxLabel = new RegExp(`^(${labels.join('|')}):`);
  this.txt = '';
  this.writer = writer;

  this._specialEscapeEncoding = false;
  if (options && typeof options._specialEscapeEncoding === 'boolean') {
    this._specialEscapeEncoding = options._specialEscapeEncoding;
  }
}

ParseSimpleSearch.prototype.parse = function(txt) {
  this.txt = txt;
  while (this.txt.length > 0) {
    this._parseExpr();
  }
};

ParseSimpleSearch.prototype._parseQuoted = function _parseQuoted(label) {
  var ok = true;
  var result = [];

  while (ok && this.txt.length > 0) {
    var m = rxVisibleNotQuote.exec(this.txt);
    if (m) {
      var str = m[1];
      this.txt = this.txt.slice(str.length);

      if (this._specialEscapeEncoding) {
        if (
          str[str.length - 1] === '\\' &&
          this.txt[0] === '"' &&
          this.txt.length === 2 &&
          this.txt[1] === '"'
        ) {
          // the string ended with an escaped double quote
          result.push('"');
          this.txt = this.txt.slice(2);
          continue;
        } else if (
          str[str.length - 1] === '\\' &&
          this.txt[0] === '"' &&
          this.txt.length === 1
        ) {
          // the string ended with a backslash
          result.push(str);
          this.txt = this.txt.slice(1);
          continue;
        }
      }

      if (str[str.length - 1] === '\\' && this.txt[0] === '"') {
        str = str.slice(0, -1) + '"';
        result.push(str);
      } else {
        result.push(str);
        ok = false;
      }
    } else {
      ok = false;
    }
    this.txt = this.txt.slice(1);
  }
  return this.writer.text(label, result.join(''));
};

ParseSimpleSearch.prototype._parseList = function _parseList() {
  this.writer.marker('_LIST');
  while (this.txt.length > 0) {
    this.txt = this.txt.replace(/^\s+/, '');
    if (/^\)/.test(this.txt)) {
      this.txt = this.txt.slice(1);
      this.writer.list();
      return true;
    }
    this._parseExpr();
  }
};

ParseSimpleSearch.prototype._parseInvalidToken = function _parseInvalidToken() {
  // mark a failed parsing state after being
  // unable to consume the current token
  this.writer.marker('_INVALID', this.txt[0]);
  // discard bad token ensure parsing finishes
  this.txt = this.txt.slice(1);
};

ParseSimpleSearch.prototype._parseSimpleToken = function _parseSimpleToken() {
  this.txt = this.txt.replace(/^\s+/, '');

  var m;
  if ((m = /^\(\s*\)/.exec(this.txt))) {
    this.txt = this.txt.replace(/^\(\s*\)/, '');
    this.txt.slice(m[0].length);
    this.writer.text('TEXT', m[0]);
    this._parseSimpleToken();
  } else if (/^\(/.test(this.txt)) {
    this.txt = this.txt.slice(1);
    this._parseList();
  } else if (/^-\S/.test(this.txt)) {
    this.txt = this.txt.slice(1);
    this._parseSimpleToken();
    this.writer.not();
  } else if (/^"/.test(this.txt)) {
    this.txt = this.txt.slice(1);
    this._parseQuoted('TEXT');
  } else if ((m = this.rxLabel.exec(this.txt))) {
    this.txt = this.txt.slice(m[0].length);
    this._labelString(m[1]);
  } else if ((m = rxWord.exec(this.txt))) {
    this.txt = this.txt.slice(m[1].length);

    if (isReservedWord(m[1])) {
      // bail out having consumed the token
      return true;
    }

    this.writer.text('TEXT', m[1]);
  } else if ((m = /^[^)\s]+/.exec(this.txt))) {
    this.txt = this.txt.slice(m[0].length);
    this.writer.text('TEXT', m[0]);
  } else {
    return false;
  }

  return true;
};

ParseSimpleSearch.prototype._labelString = function _labelString(label) {
  label = label.toUpperCase();

  this.txt = this.txt.replace(/^\s+/, '');

  var m;
  if (/^"/.test(this.txt)) {
    this.txt = this.txt.slice(1);
    this._parseQuoted(label);
  } else if ((m = rxWord.exec(this.txt))) {
    var str = m[1];
    this.txt = this.txt.slice(str.length);
    this.writer.text(label, str);
  } else {
    this.writer.text(label, '');
  }
};

ParseSimpleSearch.prototype._parseExpr = function _parseExpr() {
  if (!this._parseSimpleToken()) {
    this._parseInvalidToken();
    return true;
  }
  this.txt = this.txt.replace(/^\s+/, '');
  while (/^OR\b/.test(this.txt)) {
    this.txt = this.txt.slice(2);
    if (!this.txt) {
      break;
    }
    var r = this._parseSimpleToken();
    if (!r) {
      break;
    }
    this.writer.or();
    this.txt = this.txt.replace(/^\s+/, '');
  }
  return true;
};

module.exports = ParseSimpleSearch;
