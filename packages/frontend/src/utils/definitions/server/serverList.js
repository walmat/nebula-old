import PropTypes from 'prop-types';

import serverProperty, { initialServerPropertyState } from './serverProperty';

export const initialServerListState = [];

export const initialServerState = {
  type: initialServerPropertyState,
  size: initialServerPropertyState,
  location: initialServerPropertyState,
  charges: '',
  status: '',
  action: '',
};

export const server = PropTypes.shape({
  type: serverProperty,
  size: serverProperty,
  location: serverProperty,
  charges: PropTypes.string,
  status: PropTypes.string,
  action: PropTypes.string,
});

export const serverList = PropTypes.arrayOf(server);

export default serverList;
