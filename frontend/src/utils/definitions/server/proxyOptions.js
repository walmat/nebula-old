import PropTypes from 'prop-types';

export const initialProxyOptionsState = {
  numProxies: 0,
  username: '',
  password: '',
  errors: {}, // TODO: Replace with initialProxyOptionsErrorState (when it gets defined)
};

const proxyOptions = PropTypes.shape({
  numProxies: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]),
  username: PropTypes.string,
  password: PropTypes.string,
  errors: PropTypes.objectOf(PropTypes.any), // TODO: Define this!
});

export default proxyOptions;
