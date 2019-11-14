module.exports = {
  literal: function(label, str) {
    return (
      label.toUpperCase() + ' {' + Buffer.from(str).length + '+}\r\n' + str
    );
  },
  or: function(l, r) {
    return '(OR ' + l + ' ' + r + ')';
  },
  list: function(elems) {
    return '(' + elems.join(' ') + ')';
  },
  not: function(str) {
    return 'NOT ' + str;
  }
};
