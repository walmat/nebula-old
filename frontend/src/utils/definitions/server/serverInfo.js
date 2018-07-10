import PropTypes from 'prop-types';

import awsCredentials from './awsCredentials';
import proxyOptions from './proxyOptions';
import serverOptions from './serverOptions';

const serverInfo = PropTypes.shape({
  credentials: awsCredentials,
  proxyOptions,
  serverOptions,
});

export default serverInfo;
