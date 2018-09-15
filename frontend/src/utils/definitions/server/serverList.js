import PropTypes from 'prop-types';

export const serverRow = PropTypes.shape({
  type: PropTypes.string,
  size: PropTypes.string,
  location: PropTypes.string,
  charges: PropTypes.string,
  status: PropTypes.string,
  action: PropTypes.string,
});

export const serverList = PropTypes.arrayOf(serverRow);

export default serverList;
