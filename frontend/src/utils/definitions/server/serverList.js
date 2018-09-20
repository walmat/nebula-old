import PropTypes from 'prop-types';

import serverLocation from './serverLocation';
import serverSize from './serverSize';
import serverType from './serverType';

export const initialServerListState = [];

export const serverRow = PropTypes.shape({
  type: serverType,
  size: serverSize,
  location: serverLocation,
  charges: PropTypes.string,
  status: PropTypes.string,
  action: PropTypes.string,
});

export const serverList = PropTypes.arrayOf(serverRow);

export default serverList;
