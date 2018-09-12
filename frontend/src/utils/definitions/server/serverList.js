import PropTypes from 'prop-types';

const serverList = PropTypes.shape({
  type: PropTypes.string,
  size: PropTypes.string,
  location: PropTypes.string,
  charges: PropTypes.string,
  status: PropTypes.string,
  action: PropTypes.string,
});

export default serverList;
