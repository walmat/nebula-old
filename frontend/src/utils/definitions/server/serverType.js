import PropTypes from 'prop-types';

const serverType = PropTypes.shape({
  id: PropTypes.number,
  value: PropTypes.string,
  label: PropTypes.string,
  sizes: PropTypes.arrayOf(PropTypes.number),
});

export default serverType;
