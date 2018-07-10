import PropTypes from 'prop-types';

import awsCredentials from './awsCredentials';
import serverOptions from './serverOptions';

const coreServer = PropTypes.shape({
  path: PropTypes.string,
  serverOptions,
  awsCredentials,
});

export default coreServer;
