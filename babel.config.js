module.exports = api => {
  const presets = [
    [
      '@babel/preset-env',
      {
        targets: {
          browsers: ['>0.2%', 'not dead', 'not ie <= 11', 'not op_mini all'],
          node: 'current',
        },
      },
    ],
    '@babel/preset-react',
  ];
  const plugins = [
    '@babel/plugin-transform-runtime',
    '@babel/plugin-proposal-function-bind',
    '@babel/plugin-proposal-export-default-from',
    '@babel/plugin-proposal-export-namespace-from',
  ];
  if (api.env('test')) {
    return { plugins: [...plugins, 'istanbul'], presets };
  }
  return {
    plugins,
    presets,
    ignore: [
      '*.test.js',
      '*.test.jsx',
      '**__mocks__/*.js',
      '**__mocks__/*.jsx',
      '**__tests__/*.js',
      '**__tests__/*.jsx',
      '**_test/*.js',
      '**_test/*.jsx',
      'test*.js',
      'test*.jsx',
    ],
    babelrcRoots: ['.', './packages/*'],
  };
};
