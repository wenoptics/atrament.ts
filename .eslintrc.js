/* eslint-disable */
module.exports = {
  'extends': ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  'env': {
    'browser': true
  },
  plugins: ['@typescript-eslint'],
  root: true,
  'parser': '@typescript-eslint/parser',
  'rules': {
    'import/prefer-default-export': ['off'],
    'quotes': ['error', 'single', { 'allowTemplateLiterals': true }],
    'semi': ['error', 'always'],
    'no-console': ['off'],
    'no-empty': ['error', { 'allowEmptyCatch': true }],
    'no-param-reassign': ['off'],
    'no-underscore-dangle': ['off'],
    'brace-style': ['error', 'stroustrup', { 'allowSingleLine': true }],
    'comma-dangle': ['error', 'never'],
    'func-names': ['off'],
    'consistent-return': ['off'],
    'max-len': ['off'],
    'padded-blocks': ['off'],
    'global-require': ['off'],
    'no-unused-expressions': ['off'],
    'no-shadow': ['off'],
    'new-cap': ['error', { 'capIsNewExceptions': ['Polymer', 'ObjectId', 'Intercom'] }],
    'no-restricted-syntax': ['error', 'DebuggerStatement', 'LabeledStatement', 'WithStatement'],
    'no-nested-ternary': ['off'],
    'no-return-assign': ['off'],
    'no-confusing-arrow': ['off'],
    'no-cond-assign': ['off'],
    'no-mixed-operators': ['off'],
    'no-restricted-properties': ['off'],
    'no-plusplus': ['off'],
    'import/extensions': ['off']
  }
};
