import PropTypes from 'prop-types';

const serverLocation = PropTypes.shape({
  id: PropTypes.number,
  value: PropTypes.string,
  label: PropTypes.string,
});

export default serverLocation;
