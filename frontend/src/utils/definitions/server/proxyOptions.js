import PropTypes from 'prop-types';

export const initialProxyOptionsState = {
  numProxies: 0,
  username: '',
  password: '',
};

const proxyOptions = PropTypes.shape({
  numProxies: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]),
  username: PropTypes.string,
  password: PropTypes.string,
});

export default proxyOptions;
