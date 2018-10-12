import PropTypes from 'prop-types';

import awsCredentials from './awsCredentials';
import serverOptions from './serverOptions';

export const initialCoreServerState = {
  path: null,
  serverOptions: null,
  awsCredentials: null,
  errors: {}, // TOOD: replace with initial core server state errors (when this gets defined)
};

const coreServer = PropTypes.shape({
  path: PropTypes.string,
  serverOptions,
  awsCredentials,
  errors: PropTypes.objectOf(PropTypes.any), // TODO: define this!
});

export default coreServer;
