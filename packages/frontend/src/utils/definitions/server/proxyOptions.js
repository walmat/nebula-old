import PropTypes from 'prop-types';

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
