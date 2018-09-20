import PropTypes from 'prop-types';

import awsCredentials from './awsCredentials';
import serverOptions from './serverOptions';

export const initialCoreServerState = {
  path: null,
  serverOptions: null,
  awsCredentials: null,
};

const coreServer = PropTypes.shape({
  path: PropTypes.string,
  serverOptions,
  awsCredentials,
});

export default coreServer;
