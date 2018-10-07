import PropTypes from 'prop-types';

export const initialServerPropertyState = {
  id: null,
  value: '',
  label: '',
};

const serverProperty = PropTypes.shape({
  id: PropTypes.number,
  value: PropTypes.string,
  label: PropTypes.string,
});

export default serverProperty;
