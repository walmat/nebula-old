module.exports = {
  env: { browser: true },
  extends: ['airbnb', 'prettier'],
  rules: {
    'no-underscore-dangle': 'off',
  },
  parserOptions: { ecmaFeatures: { jsx: true } },
};
