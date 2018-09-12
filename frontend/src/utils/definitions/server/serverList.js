import PropTypes from 'prop-types';


const serverRow = PropTypes.shape({
  type: PropTypes.string,
  size: PropTypes.string,
  location: PropTypes.string,
  charges: PropTypes.string,
  status: PropTypes.string,
  action: PropTypes.string,
});

const serverList = PropTypes.arrayOf(serverRow);

export default serverList;
