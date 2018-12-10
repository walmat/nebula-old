module.exports = {
  env: {
    es6: true,
  },
  extends: ['airbnb-base', 'prettier'],
  parserOptions: {
    ecmaFeatures: { jsx: false }, // to be overridden as necessary
    ecmaVersion: 2018,
  },
  plugins: [],
  rules: { 'prettier/prettier': 'error' },
};
