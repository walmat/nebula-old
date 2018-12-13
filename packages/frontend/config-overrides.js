/* eslint-disable import/no-extraneous-dependencies */
const rewireYarnWorkspaces = require('react-app-rewire-yarn-workspaces');

module.exports = function override(config, env) {
  return rewireYarnWorkspaces(config, env);
};
