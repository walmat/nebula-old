import PropTypes from 'prop-types';

import awsCredentials from './awsCredentials';
import coreServer from './coreServer';
import proxy from './proxy';
import proxyOptions from './proxyOptions';
import serverOptions from './serverOptions';

const serverInfo = PropTypes.shape({
  credentials: awsCredentials,
  coreServer,
  proxies: PropTypes.arrayOf(proxy),
  proxyOptions,
  serverOptions,
});

export default serverInfo;
