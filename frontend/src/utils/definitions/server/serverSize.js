import PropTypes from 'prop-types';

const serverSize = PropTypes.shape({
  id: PropTypes.number,
  value: PropTypes.string,
  label: PropTypes.string,
  types: PropTypes.arrayOf(PropTypes.number),
});

export default serverSize;
