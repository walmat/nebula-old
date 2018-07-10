import PropTypes from 'prop-types';

const proxyOptions = PropTypes.shape({
  numProxies: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]),
  username: PropTypes.string,
  password: PropTypes.string,
});

export default proxyOptions;
