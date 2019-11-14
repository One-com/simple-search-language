var expect = require('unexpected');

var SimpleSearchWriter = require('../lib/SimpleSearchWriter');
var testWriter = require('../lib/writers/test');

describe('SimpleSearchWriter', function() {
  it('should throw on unsupported format', () => {
    expect(
      () => {
        new SimpleSearchWriter(null);
      },
      'to throw',
      'Missing writer'
    );
  });

  it('should throw on unsupported token', () => {
    expect(
      () => {
        new SimpleSearchWriter(testWriter).write([['FOOBAR']]);
      },
      'to throw',
      'Unsupported token: FOOBAR'
    );
  });

  describe('test writer', function() {
    const shouldOutputFor = (description, subject, value) => [
      'should output for: ' + description,
      function() {
        expect(
          new SimpleSearchWriter(testWriter).write(subject),
          'to equal',
          value
        );
      }
    ];

    it(...shouldOutputFor('a', ['LITERAL', 'TEXT', 'a'], 'TEXT {1+}\r\na'));

    it(
      ...shouldOutputFor(
        'a b c',
        [
          'LIST',
          ['LITERAL', 'TEXT', 'a'],
          ['LITERAL', 'TEXT', 'b'],
          ['LITERAL', 'TEXT', 'c']
        ],
        '(TEXT {1+}\r\na TEXT {1+}\r\nb TEXT {1+}\r\nc)'
      )
    );

    it(
      ...shouldOutputFor(
        'a -b c',
        [
          'LIST',
          ['LITERAL', 'TEXT', 'a'],
          ['NOT', ['LITERAL', 'TEXT', 'b']],
          ['LITERAL', 'TEXT', 'c']
        ],
        '(TEXT {1+}\r\na NOT TEXT {1+}\r\nb TEXT {1+}\r\nc)'
      )
    );

    it(
      ...shouldOutputFor(
        'a OR b',
        ['OR', ['LITERAL', 'TEXT', 'a'], ['LITERAL', 'TEXT', 'b']],
        '(OR TEXT {1+}\r\na TEXT {1+}\r\nb)'
      )
    );

    it(
      ...shouldOutputFor(
        '(a b)',
        ['LIST', ['LITERAL', 'TEXT', 'a'], ['LITERAL', 'TEXT', 'b']],
        '(TEXT {1+}\r\na TEXT {1+}\r\nb)'
      )
    );
  });
});
