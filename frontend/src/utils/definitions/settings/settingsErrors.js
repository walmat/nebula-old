import PropTypes from 'prop-types';

const settingsErrors = PropTypes.shape({
  proxies: PropTypes.arrayOf(PropTypes.number),
});

export default settingsErrors;
