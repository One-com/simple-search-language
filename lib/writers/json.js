module.exports = {
  literal: function(label, str) {
    return {
      name: label,
      attributes: {
        value: str
      }
    };
  },
  or: function(l, r) {
    return {
      name: 'OR',
      children: [l, r]
    };
  },
  list: function(elems) {
    return {
      name: 'LIST',
      children: elems
    };
  },
  not: function(rule) {
    return {
      name: 'NOT',
      children: [rule]
    };
  }
};
