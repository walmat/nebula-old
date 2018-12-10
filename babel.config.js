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
    '@babel/plugin-proposal-function-bind',
    '@babel/plugin-proposal-export-default-from',
    '@babel/plugin-proposal-export-namespace-from',
  ];
  if (api.env('test')) {
    return { plugins: [...plugins, 'istanbul'], presets };
  }
  return { plugins, presets };
};
