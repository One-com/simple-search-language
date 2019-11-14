const ParseSimpleSearch = require('./ParseSimpleSearch');

function createInvalidPhraseError(input) {
  const error = new Error('Invalid search phrase');
  error.kind = 'InvalidSearchPhrase';
  error.data = {
    input: input
  };
  return error;
}

function searchRootLevelTokens(tokens, tokenNames) {
  var lastTokenIndex = tokens.length - 1;
  var currentTokenIndex = lastTokenIndex;
  var currentTokenName;

  while (currentTokenIndex > -1) {
    currentTokenName = tokens[currentTokenIndex][0];
    if (tokenNames.indexOf(currentTokenName) > -1) {
      return true;
    }
    currentTokenIndex -= 1;
  }

  return false;
}

function SimpleSearchParser(options) {
  var tokens = (this.tokens = []);

  function popToken() {
    return tokens.pop();
  }

  function pushToken(tokenName) {
    var tokenArgs = Array.prototype.slice.call(arguments, 1);
    pushTokenWithArgs(tokenName, tokenArgs);
  }

  function pushTokenWithArgs(tokenName, tokenArgs) {
    tokenArgs = [tokenName].concat(tokenArgs);
    tokens.push(tokenArgs);
    return tokenArgs;
  }

  this.parseSimpleSearch = new ParseSimpleSearch(
    {
      text: function(label, str) {
        // disallow empty labels
        if (!str) {
          throw createInvalidPhraseError(null);
        }
        pushToken('LITERAL', label, str);
        return true;
      },
      or: function() {
        var r = popToken();
        var l = popToken();
        pushToken('OR', l, r);
      },
      list: function() {
        // pop tokens until we see the list end marker
        var elems = [];
        var token;
        while ((token = popToken())[0] !== '_LIST') {
          elems.push(token);
        }
        if (elems.length === 1) {
          // in the case only a single child write
          // there is no need to wrap it
          tokens.push(elems[0]);
        } else {
          pushTokenWithArgs('LIST', elems.reverse());
        }
      },
      marker: function(token, optionalArg) {
        pushToken(token, optionalArg);
      },
      not: function() {
        var token = popToken();
        pushToken('NOT', token);
      }
    },
    options
  );
}

SimpleSearchParser.prototype.parse = function(txt) {
  try {
    this.parseSimpleSearch.parse(txt);
  } catch (error) {
    error.data = error.data || {};
    error.data.input = txt;
    throw error;
  }

  if (searchRootLevelTokens(this.tokens, ['_LIST', '_INVALID'])) {
    throw createInvalidPhraseError(txt);
  }

  if (this.tokens.length === 1) {
    return this.tokens[0];
  } else {
    return ['LIST'].concat(this.tokens);
  }
};

module.exports = SimpleSearchParser;
