import PropTypes from 'prop-types';

export const initialProxyOptionsState = {
  numProxies: 0,
  location: null,
  username: '',
  password: '',
  errors: {}, // TODO: Replace with initialProxyOptionsErrorState (when it gets defined)
};

const proxyOptions = PropTypes.shape({
  numProxies: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  location: PropTypes.shape({
    id: PropTypes.number,
    label: PropTypes.string,
    value: PropTypes.string,
  }),
  username: PropTypes.string,
  password: PropTypes.string,
  errors: PropTypes.objectOf(PropTypes.any), // TODO: Define this!
});

export default proxyOptions;
