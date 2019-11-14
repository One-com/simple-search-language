var expect = require('unexpected');

var SimpleSearchParser = require('../lib/SimpleSearchParser');

function test(input, output, options) {
  it('should parse: ' + input, function() {
    expect(new SimpleSearchParser(options).parse(input), 'to equal', output);
  });
}

describe('SimpleSearchParser', function() {
  test('a', ['LITERAL', 'TEXT', 'a']);
  test('a -b c', [
    'LIST',
    ['LITERAL', 'TEXT', 'a'],
    ['NOT', ['LITERAL', 'TEXT', 'b']],
    ['LITERAL', 'TEXT', 'c']
  ]);
  test('a - b c', [
    'LIST',
    ['LITERAL', 'TEXT', 'a'],
    ['LITERAL', 'TEXT', '-'],
    ['LITERAL', 'TEXT', 'b'],
    ['LITERAL', 'TEXT', 'c']
  ]);
  test('a OR b c', [
    'LIST',
    ['OR', ['LITERAL', 'TEXT', 'a'], ['LITERAL', 'TEXT', 'b']],
    ['LITERAL', 'TEXT', 'c']
  ]);
  test('a OR b OR c', [
    'OR',
    ['OR', ['LITERAL', 'TEXT', 'a'], ['LITERAL', 'TEXT', 'b']],
    ['LITERAL', 'TEXT', 'c']
  ]);
  test('OR a OR b', ['OR', ['LITERAL', 'TEXT', 'a'], ['LITERAL', 'TEXT', 'b']]);
  test('a OR b OR', ['OR', ['LITERAL', 'TEXT', 'a'], ['LITERAL', 'TEXT', 'b']]);
  test('a OR (b OR -c)', [
    'OR',
    ['LITERAL', 'TEXT', 'a'],
    ['OR', ['LITERAL', 'TEXT', 'b'], ['NOT', ['LITERAL', 'TEXT', 'c']]]
  ]);
  test('(a b)  c', [
    'LIST',
    ['LIST', ['LITERAL', 'TEXT', 'a'], ['LITERAL', 'TEXT', 'b']],
    ['LITERAL', 'TEXT', 'c']
  ]);
  test('-(a b)  c', [
    'LIST',
    ['NOT', ['LIST', ['LITERAL', 'TEXT', 'a'], ['LITERAL', 'TEXT', 'b']]],
    ['LITERAL', 'TEXT', 'c']
  ]);
  test('----', ['NOT', ['NOT', ['NOT', ['LITERAL', 'TEXT', '-']]]]);
  test('(a b c) OR (d e f) OR (goo hat inc)', [
    'OR',
    [
      'OR',
      [
        'LIST',
        ['LITERAL', 'TEXT', 'a'],
        ['LITERAL', 'TEXT', 'b'],
        ['LITERAL', 'TEXT', 'c']
      ],
      [
        'LIST',
        ['LITERAL', 'TEXT', 'd'],
        ['LITERAL', 'TEXT', 'e'],
        ['LITERAL', 'TEXT', 'f']
      ]
    ],
    [
      'LIST',
      ['LITERAL', 'TEXT', 'goo'],
      ['LITERAL', 'TEXT', 'hat'],
      ['LITERAL', 'TEXT', 'inc']
    ]
  ]);
  test('a OR (b OR (c OR (d OR -e)))', [
    'OR',
    ['LITERAL', 'TEXT', 'a'],
    [
      'OR',
      ['LITERAL', 'TEXT', 'b'],
      [
        'OR',
        ['LITERAL', 'TEXT', 'c'],
        ['OR', ['LITERAL', 'TEXT', 'd'], ['NOT', ['LITERAL', 'TEXT', 'e']]]
      ]
    ]
  ]);
  test('(((a OR b) OR c) OR d) OR -e', [
    'OR',
    [
      'OR',
      [
        'OR',
        ['OR', ['LITERAL', 'TEXT', 'a'], ['LITERAL', 'TEXT', 'b']],
        ['LITERAL', 'TEXT', 'c']
      ],
      ['LITERAL', 'TEXT', 'd']
    ],
    ['NOT', ['LITERAL', 'TEXT', 'e']]
  ]);
  // Quotes
  test('some "quoted text" foo', [
    'LIST',
    ['LITERAL', 'TEXT', 'some'],
    ['LITERAL', 'TEXT', 'quoted text'],
    ['LITERAL', 'TEXT', 'foo']
  ]);
  test('some "quoted text \\"with escapes\\" here" foo', [
    'LIST',
    ['LITERAL', 'TEXT', 'some'],
    ['LITERAL', 'TEXT', 'quoted text "with escapes" here'],
    ['LITERAL', 'TEXT', 'foo']
  ]);
  test('in quotes "Ignore \\other \\escapes" a b', [
    'LIST',
    ['LITERAL', 'TEXT', 'in'],
    ['LITERAL', 'TEXT', 'quotes'],
    ['LITERAL', 'TEXT', 'Ignore \\other \\escapes'],
    ['LITERAL', 'TEXT', 'a'],
    ['LITERAL', 'TEXT', 'b']
  ]);
  test('quoted backslash "\\ \\" \\\\ hehehe"', [
    'LIST',
    ['LITERAL', 'TEXT', 'quoted'],
    ['LITERAL', 'TEXT', 'backslash'],
    ['LITERAL', 'TEXT', '\\ " \\\\ hehehe']
  ]);
  test('"some foo" OR "other foo"', [
    'OR',
    ['LITERAL', 'TEXT', 'some foo'],
    ['LITERAL', 'TEXT', 'other foo']
  ]);
  // Parentheses
  test('()()nested parenthesis are strange((()))', [
    'LIST',
    ['LITERAL', 'TEXT', '()'],
    ['LITERAL', 'TEXT', '()'],
    ['LITERAL', 'TEXT', 'nested'],
    ['LITERAL', 'TEXT', 'parenthesis'],
    ['LITERAL', 'TEXT', 'are'],
    ['LITERAL', 'TEXT', 'strange'],
    ['LITERAL', 'TEXT', '()']
  ]);
  test('now() and ()here', [
    'LIST',
    ['LITERAL', 'TEXT', 'now'],
    ['LITERAL', 'TEXT', '()'],
    ['LITERAL', 'TEXT', 'and'],
    ['LITERAL', 'TEXT', '()'],
    ['LITERAL', 'TEXT', 'here']
  ]);
  // Labels
  test('subject: quux', ['LITERAL', 'SUBJECT', 'quux']);
  test('from: quux', ['LITERAL', 'FROM', 'quux']);
  test('to: quux', ['LITERAL', 'TO', 'quux']);
  test('cc: quux', ['LITERAL', 'CC', 'quux']);
  test('bcc: quux', ['LITERAL', 'BCC', 'quux']);
  test('body: quux', ['LITERAL', 'BODY', 'quux']);
  // Labels (complex)
  test('to: this is for goo', [
    'LIST',
    ['LITERAL', 'TO', 'this'],
    ['LITERAL', 'TEXT', 'is'],
    ['LITERAL', 'TEXT', 'for'],
    ['LITERAL', 'TEXT', 'goo']
  ]);
  test('from: "mr. quoted foo"', ['LITERAL', 'FROM', 'mr. quoted foo']);
  test('subject: nukes from: "mr. quoted foo" eggs', [
    'LIST',
    ['LITERAL', 'SUBJECT', 'nukes'],
    ['LITERAL', 'FROM', 'mr. quoted foo'],
    ['LITERAL', 'TEXT', 'eggs']
  ]);
  // TODO:
  test('notalabel: bingo', [
    'LIST',
    ['LITERAL', 'TEXT', 'notalabel:'],
    ['LITERAL', 'TEXT', 'bingo']
  ]);

  describe('with invalid queries', () => {
    const shouldThrowFor = subject => [
      'should throw for: ' + subject,
      function() {
        expect(
          () => {
            new SimpleSearchParser().parse(subject);
          },
          'to throw',
          expect
            .it('to have message', 'Invalid search phrase')
            .and('to satisfy', {
              kind: 'InvalidSearchPhrase',
              data: {
                input: subject
              }
            })
        );
      }
    ];

    it(...shouldThrowFor('('));
    it(...shouldThrowFor(')'));
    it(...shouldThrowFor('((('));
    it(...shouldThrowFor('()('));

    // empty labels
    it(...shouldThrowFor('from:'));
  });

  describe('without _specialEscapeEncoding', () => {
    test('from:"\\""', ['LITERAL', 'FROM', '"']);
    test('from:"\\"', ['LITERAL', 'FROM', '"']);
    test('from:"\\\\"', ['LITERAL', 'FROM', '\\"']);
    test('from:"blah\\"', ['LITERAL', 'FROM', 'blah"']);
  });

  describe('when _specialEscapeEncoding', () => {
    test('from:"\\""', ['LITERAL', 'FROM', '"'], {
      _specialEscapeEncoding: true
    });
    test('from:"\\"', ['LITERAL', 'FROM', '\\'], {
      _specialEscapeEncoding: true
    });
    test('from:"\\\\"', ['LITERAL', 'FROM', '\\\\'], {
      _specialEscapeEncoding: true
    });
    test('from:"blah\\"', ['LITERAL', 'FROM', 'blah\\'], {
      _specialEscapeEncoding: true
    });
  });
});
