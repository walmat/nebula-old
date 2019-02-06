/* eslint-disable import/no-extraneous-dependencies */
const rewireYarnWorkspaces = require('react-app-rewire-yarn-workspaces');

module.exports = function override(config, env) {
  const overwrittenConfig = { ...config };
  if (env === 'production') {
    const { rules } = config.module;
    // Looks like rules.map is undefined, so we need to use a for loop here
    // This hack will go away once we start using svgs correctly (See issue #308)
    // eslint-disable-next-line no-restricted-syntax
    for (const rule of rules) {
      if (rule.oneOf) {
        const newOneOfList = rule.oneOf.slice(0, -1);
        newOneOfList.push({
          loader: require.resolve('url-loader'),
          exclude: [/\.(js|mjs|jsx|ts|tsx)$/, /\.html$/, /\.json$/],
          options: {
            name: 'static/media/[name].[hash:8].[ext]',
          },
        });
        rule.oneOf = newOneOfList;
      }
    }
    overwrittenConfig.module.rules = config.module.rules;
  }

  return rewireYarnWorkspaces(overwrittenConfig, env);
};
