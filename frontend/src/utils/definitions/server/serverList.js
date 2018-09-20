import PropTypes from 'prop-types';

import serverProperty from './serverProperty';

export const initialServerListState = [];

export const serverRow = PropTypes.shape({
  type: serverProperty,
  size: serverProperty,
  location: serverProperty,
  charges: PropTypes.string,
  status: PropTypes.string,
  action: PropTypes.string,
});

export const serverList = PropTypes.arrayOf(serverRow);

export default serverList;
