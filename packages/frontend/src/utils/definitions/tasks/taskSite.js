import PropTypes from 'prop-types';

const taskSite = PropTypes.shape({
  name: PropTypes.string,
  url: PropTypes.string,
  supported: PropTypes.bool,
  apiKey: PropTypes.string,
  auth: PropTypes.bool,
});

export default taskSite;
