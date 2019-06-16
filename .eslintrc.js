module.exports = {
  root: true,
  env: {
    es6: true,
  },
  extends: ['airbnb', 'prettier'],
  parserOptions: {
    ecmaFeatures: { jsx: false }, // to be overridden as necessary
    ecmaVersion: 2018,
  },
  plugins: ['prettier', 'react', 'import', 'jsx-a11y'],
  rules: {
    'no-param-reassign': 0,
    'prettier/prettier': 'error',
    'no-underscore-dangle': 'off',
    'camelcase': 'warn',
  },
};
