import PropTypes from 'prop-types';

import awsCredentials from './awsCredentials';
import coreServer from './coreServer';
import proxy from '../settings/proxy';
import proxyOptions from './proxyOptions';
import serverOptions from './serverOptions';

const serverInfo = PropTypes.shape({
  credentials: awsCredentials,
  coreServer,
  proxies: PropTypes.arrayOf(proxy),
  proxyOptions,
  serverOptions,
  errors: PropTypes.objectOf(PropTypes.any), // TODO: define this!
});

export default serverInfo;
