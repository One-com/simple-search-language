var expect = require('unexpected');

var createProcessSearch = require('../lib/processSearch');
var testWriter = require('../lib/writers/test');

var testLabels = ['from', 'to', 'cc', 'bcc'];
var processSearch = createProcessSearch({
  labels: testLabels
});

function createTestUsingWriter(writer) {
  return function test(searchString, expected) {
    it("converts query '" + searchString + "'", function() {
      var result = processSearch(searchString, { format: writer });

      expect(result, 'to equal', expected);
    });
  };
}

const shouldOutputFor = (subject, value) => [
  'should output for: ' + subject,
  function() {
    expect(processSearch(subject, { format: 'test' }), 'to equal', value);
  }
];

describe('processSearch', function() {
  it('should throw when no labels are supplied', () => {
    expect(
      () => {
        createProcessSearch();
      },
      'to throw',
      'missing labels'
    );
  });

  it('should throw when an empty labels array is supplied', () => {
    expect(
      () => {
        createProcessSearch({ labels: [] });
      },
      'to throw',
      'missing labels'
    );
  });

  it('should throw when invalid labels are supplied', () => {
    expect(
      () => {
        createProcessSearch({ labels: ['label0'] });
      },
      'to throw',
      'invalid label (must be a-z lower case with no spaces)'
    );
  });

  it('should throw on an attempt to include the label "text"', () => {
    expect(
      () => {
        createProcessSearch({ labels: ['text'] });
      },
      'to throw',
      'invalid label ("text" is not an allowed label)'
    );
  });

  describe('when configured with labels', () => {
    it('should throw with no search phrase', () => {
      expect(
        () => {
          processSearch();
        },
        'to throw',
        'missing search phrase'
      );
    });

    it('should throw with no specified outputter', () => {
      expect(
        () => {
          processSearch('');
        },
        'to throw',
        'outputter function not supplied'
      );
    });

    it('should throw if the format does not exist', () => {
      expect(
        () => {
          processSearch('', { format: 'random' });
        },
        'to throw',
        'unsupported format "random"'
      );
    });
  });

  describe('when a post parsing conversion funciton is provided', () => {
    it('should call the function after parsing', () => {
      let fnArgs;
      const processParsedOutput = (...args) => (fnArgs = args);

      const result = processSearch('', { format: 'json', processParsedOutput });

      expect(fnArgs, 'to equal', [['LIST']]);
      expect(result, 'to equal', '');
    });

    it('should allow the function to return a new parse tree', () => {
      const processParsedOutput = (...args) => ['LITERAL', 'TEXT', 'a'];

      const result = processSearch('', { format: 'json', processParsedOutput });

      expect(result, 'to equal', { name: 'TEXT', attributes: { value: 'a' } });
    });

    it('should allow the function to throw', () => {
      const processParsedOutput = (...args) => {
        throw new Error('foobar');
      };

      expect(
        () => {
          processSearch('', { format: 'json', processParsedOutput });
        },
        'to throw',
        'foobar'
      );
    });

    it('should attach the input search string to the error', () => {
      const processParsedOutput = (...args) => {
        throw new Error('foobar');
      };

      expect(
        () => {
          processSearch('quux', { format: 'json', processParsedOutput });
        },
        'to throw',
        expect.it('to satisfy', { data: { input: 'quux' } })
      );
    });
  });

  describe('with writer "test"', function() {
    var test = createTestUsingWriter('test');

    test('a -b c', '(TEXT {1+}\r\na NOT TEXT {1+}\r\nb TEXT {1+}\r\nc)');
    test(
      'a - b c',
      '(TEXT {1+}\r\na TEXT {1+}\r\n- TEXT {1+}\r\nb TEXT {1+}\r\nc)'
    );
    test('a OR b c', '((OR TEXT {1+}\r\na TEXT {1+}\r\nb) TEXT {1+}\r\nc)');
    test(
      'a OR b OR c',
      '(OR (OR TEXT {1+}\r\na TEXT {1+}\r\nb) TEXT {1+}\r\nc)'
    );
    test('OR a OR b', '(OR TEXT {1+}\r\na TEXT {1+}\r\nb)');
    test('a OR b OR', '(OR TEXT {1+}\r\na TEXT {1+}\r\nb)');
    test(
      'a OR (b OR -c)',
      '(OR TEXT {1+}\r\na (OR TEXT {1+}\r\nb NOT TEXT {1+}\r\nc))'
    );
    test('(a b)  c', '((TEXT {1+}\r\na TEXT {1+}\r\nb) TEXT {1+}\r\nc)');
    test('-(a b)  c', '(NOT (TEXT {1+}\r\na TEXT {1+}\r\nb) TEXT {1+}\r\nc)');
    test('----', 'NOT NOT NOT TEXT {1+}\r\n-');
    test(
      '(a b c) OR (d e f) OR (goo hat inc)',
      '(OR (OR (TEXT {1+}\r\na TEXT {1+}\r\nb TEXT {1+}\r\nc) (TEXT {1+}\r\nd TEXT {1+}\r\ne TEXT {1+}\r\nf)) (TEXT {3+}\r\ngoo TEXT {3+}\r\nhat TEXT {3+}\r\ninc))'
    );
    test(
      'a OR (b OR (c OR (d OR -e)))',
      '(OR TEXT {1+}\r\na (OR TEXT {1+}\r\nb (OR TEXT {1+}\r\nc (OR TEXT {1+}\r\nd NOT TEXT {1+}\r\ne))))'
    );
    test(
      '(((a OR b) OR c) OR d) OR -e',
      '(OR (OR (OR (OR TEXT {1+}\r\na TEXT {1+}\r\nb) TEXT {1+}\r\nc) TEXT {1+}\r\nd) NOT TEXT {1+}\r\ne)'
    );
    // Quotes
    test(
      'some "quoted text" foo',
      '(TEXT {4+}\r\nsome TEXT {11+}\r\nquoted text TEXT {3+}\r\nfoo)'
    );
    test(
      'some "quoted text \\"with escapes\\" here" foo',
      '(TEXT {4+}\r\nsome TEXT {31+}\r\nquoted text "with escapes" here TEXT {3+}\r\nfoo)'
    );
    test(
      'in quotes "Ignore \\other \\escapes" a b',
      '(TEXT {2+}\r\nin TEXT {6+}\r\nquotes TEXT {22+}\r\nIgnore \\other \\escapes TEXT {1+}\r\na TEXT {1+}\r\nb)'
    );
    test(
      'quoted backslash "\\ \\" \\\\ hehehe"',
      '(TEXT {6+}\r\nquoted TEXT {9+}\r\nbackslash TEXT {13+}\r\n\\ " \\\\ hehehe)'
    );
    test(
      '"some foo" OR "other foo"',
      '(OR TEXT {8+}\r\nsome foo TEXT {9+}\r\nother foo)'
    );
    // Parentheses
    test(
      '()()nested parenthesis are strange((()))',
      '(TEXT {2+}\r\n() TEXT {2+}\r\n() TEXT {6+}\r\nnested TEXT {11+}\r\nparenthesis TEXT {3+}\r\nare TEXT {7+}\r\nstrange TEXT {2+}\r\n())'
    );
    test(
      'now() and ()here',
      '(TEXT {3+}\r\nnow TEXT {2+}\r\n() TEXT {3+}\r\nand TEXT {2+}\r\n() TEXT {4+}\r\nhere)'
    );
    // Labels
    test(
      'to: this is for goo',
      '(TO {4+}\r\nthis TEXT {2+}\r\nis TEXT {3+}\r\nfor TEXT {3+}\r\ngoo)'
    );
    test('from: "mr. quoted foo"', 'FROM {14+}\r\nmr. quoted foo');
    test(
      'from: nukes from: "mr. quoted foo" eggs',
      '(FROM {5+}\r\nnukes FROM {14+}\r\nmr. quoted foo TEXT {4+}\r\neggs)'
    );
    test('notalabel: bingo', '(TEXT {10+}\r\nnotalabel: TEXT {5+}\r\nbingo)');

    describe('with header conversion cases', () => {
      it(...shouldOutputFor('a', 'TEXT {1+}\r\na'));
      it(
        ...shouldOutputFor(
          'a b c',
          '(TEXT {1+}\r\na TEXT {1+}\r\nb TEXT {1+}\r\nc)'
        )
      );
      it(
        ...shouldOutputFor(
          'a -b c',
          '(TEXT {1+}\r\na NOT TEXT {1+}\r\nb TEXT {1+}\r\nc)'
        )
      );
      it(...shouldOutputFor('a OR b', '(OR TEXT {1+}\r\na TEXT {1+}\r\nb)'));
      it(...shouldOutputFor('(a b)', '(TEXT {1+}\r\na TEXT {1+}\r\nb)'));
    });
  });

  describe('with writer "json"', function() {
    var test = createTestUsingWriter('json');

    test('a OR b', {
      name: 'OR',
      children: [
        { name: 'TEXT', attributes: { value: 'a' } },
        { name: 'TEXT', attributes: { value: 'b' } }
      ]
    });

    test('-(a OR b)', {
      name: 'NOT',
      children: [
        {
          name: 'OR',
          children: [
            { name: 'TEXT', attributes: { value: 'a' } },
            { name: 'TEXT', attributes: { value: 'b' } }
          ]
        }
      ]
    });

    test('(a b OR c OR (d -e))', {
      name: 'LIST',
      children: [
        { name: 'TEXT', attributes: { value: 'a' } },
        {
          name: 'OR',
          children: [
            {
              name: 'OR',
              children: [
                { name: 'TEXT', attributes: { value: 'b' } },
                { name: 'TEXT', attributes: { value: 'c' } }
              ]
            },
            {
              name: 'LIST',
              children: [
                { name: 'TEXT', attributes: { value: 'd' } },
                {
                  name: 'NOT',
                  children: [{ name: 'TEXT', attributes: { value: 'e' } }]
                }
              ]
            }
          ]
        }
      ]
    });

    test('Funky food "with beets"', {
      name: 'LIST',
      children: [
        { name: 'TEXT', attributes: { value: 'Funky' } },
        { name: 'TEXT', attributes: { value: 'food' } },
        { name: 'TEXT', attributes: { value: 'with beets' } }
      ]
    });

    test('cc: me@foo.com OR bcc: me@foo.com', {
      name: 'OR',
      children: [
        { name: 'CC', attributes: { value: 'me@foo.com' } },
        { name: 'BCC', attributes: { value: 'me@foo.com' } }
      ]
    });

    test('cc: me@foo.com OR bcc: me@foo.com OR hababab', {
      name: 'OR',
      children: [
        {
          name: 'OR',
          children: [
            { name: 'CC', attributes: { value: 'me@foo.com' } },
            { name: 'BCC', attributes: { value: 'me@foo.com' } }
          ]
        },
        { name: 'TEXT', attributes: { value: 'hababab' } }
      ]
    });

    test('-(hello to the world)', {
      name: 'NOT',
      children: [
        {
          name: 'LIST',
          children: [
            { name: 'TEXT', attributes: { value: 'hello' } },
            { name: 'TEXT', attributes: { value: 'to' } },
            { name: 'TEXT', attributes: { value: 'the' } },
            { name: 'TEXT', attributes: { value: 'world' } }
          ]
        }
      ]
    });

    test('cc: me@foo.com bcc: me@foo.com', {
      name: 'LIST',
      children: [
        { name: 'CC', attributes: { value: 'me@foo.com' } },
        { name: 'BCC', attributes: { value: 'me@foo.com' } }
      ]
    });

    test('cc: me@foo.com bcc: me@foo.com They have eggs', {
      name: 'LIST',
      children: [
        { name: 'CC', attributes: { value: 'me@foo.com' } },
        { name: 'BCC', attributes: { value: 'me@foo.com' } },
        { name: 'TEXT', attributes: { value: 'They' } },
        { name: 'TEXT', attributes: { value: 'have' } },
        { name: 'TEXT', attributes: { value: 'eggs' } }
      ]
    });

    test('Some foo to: moo@bar.com cc: It is time', {
      name: 'LIST',
      children: [
        { name: 'TEXT', attributes: { value: 'Some' } },
        { name: 'TEXT', attributes: { value: 'foo' } },
        { name: 'TO', attributes: { value: 'moo@bar.com' } },
        { name: 'CC', attributes: { value: 'It' } },
        { name: 'TEXT', attributes: { value: 'is' } },
        { name: 'TEXT', attributes: { value: 'time' } }
      ]
    });

    test('Some foo to: moo@bar.com cc: "It is time"', {
      name: 'LIST',
      children: [
        { name: 'TEXT', attributes: { value: 'Some' } },
        { name: 'TEXT', attributes: { value: 'foo' } },
        { name: 'TO', attributes: { value: 'moo@bar.com' } },
        { name: 'CC', attributes: { value: 'It is time' } }
      ]
    });
  });

  describe('with a custom writer', function() {
    it("converts query 'a'", function() {
      var result = processSearch('a', { outputter: testWriter });

      expect(result, 'to equal', 'TEXT {1+}\r\na');
    });
  });
});
