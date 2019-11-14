module.exports = {
  extends: ['standard', 'prettier', 'prettier/standard'],
  parserOptions: {
    ecmaVersion: 2018
  },
  env: {
    mocha: true
  },
  overrides: [
    {
      files: ['test/**/*.js'],
      rules: {
        'no-new': 'off'
      }
    }
  ]
};
