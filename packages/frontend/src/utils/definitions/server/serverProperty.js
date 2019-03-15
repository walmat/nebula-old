import PropTypes from 'prop-types';

const serverProperty = PropTypes.shape({
  id: PropTypes.number,
  value: PropTypes.string,
  label: PropTypes.string,
});

export default serverProperty;
