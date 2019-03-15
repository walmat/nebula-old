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
  errors: {}, // TODO: Replace with initial serverInfoErrorState (when it gets defined)
};

const serverInfo = PropTypes.shape({
  credentials: awsCredentials,
  coreServer,
  proxies: PropTypes.arrayOf(proxy),
  proxyOptions,
  serverOptions,
  errors: PropTypes.objectOf(PropTypes.any), // TODO: define this!
});

export default serverInfo;
