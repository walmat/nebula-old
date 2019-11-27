import PropTypes from 'prop-types';

import awsCredentials from './awsCredentials';
import serverOptions from './serverOptions';

const coreServer = PropTypes.shape({
  path: PropTypes.string,
  serverOptions,
  awsCredentials,
  errors: PropTypes.objectOf(PropTypes.any), // TODO: define this!
});

export default coreServer;
