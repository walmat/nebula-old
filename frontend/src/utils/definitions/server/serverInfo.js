import PropTypes from 'prop-types';

import awsCredentials, { initialAwsCredentialsState } from './awsCredentials';
import coreServer, { initialCoreServerState } from './coreServer';
import proxy from '../settings/proxy';
import proxyOptions, { initialProxyOptionsState } from './proxyOptions';
import serverOptions, { initialServerOptionsState } from './serverOptions';

export const initialServerInfoState = {
  credentials: initialAwsCredentialsState,
  proxyOptions: initialProxyOptionsState,
  coreServer: initialCoreServerState,
  proxies: [],
  serverOptions: initialServerOptionsState,
};

const serverInfo = PropTypes.shape({
  credentials: awsCredentials,
  coreServer,
  proxies: PropTypes.arrayOf(proxy),
  proxyOptions,
  serverOptions,
});

export default serverInfo;
