const SimpleSearchParser = require('./SimpleSearchParser');
const SimpleSearchWriter = require('./SimpleSearchWriter');
const writers = require('./writers');

module.exports = function processSearch(searchPhrase, options) {
  if (typeof searchPhrase !== 'string') {
    throw new Error('missing search phrase');
  }

  options = options || {};
  const processParsedOutput =
    typeof options.processParsedOutput === 'function'
      ? options.processParsedOutput
      : () => {};
  const parserOptions = options.parserOptions || {};
  const writerOptions = options.writerOptions || {};

  let outputter;
  if (typeof options.outputter === 'object' && options.outputter) {
    outputter = options.outputter;
  } else if (typeof options.format === 'string') {
    outputter = writers[options.format];
    if (!outputter) {
      throw new Error(`unsupported format "${options.format}"`);
    }
  } else {
    throw new Error('outputter function not supplied');
  }

  const parser = new SimpleSearchParser(parserOptions);
  const writer = new SimpleSearchWriter(outputter, writerOptions);

  let parsedOutput = parser.parse(searchPhrase);
  try {
    const maybeProcessed = processParsedOutput(parsedOutput);
    if (maybeProcessed) {
      parsedOutput = maybeProcessed;
    }
  } catch (error) {
    // make the searchPhrase accessible via the error object
    if (!error.data) error.data = {};
    error.data.input = searchPhrase;
    throw error;
  }

  return writer.write(parsedOutput);
};
