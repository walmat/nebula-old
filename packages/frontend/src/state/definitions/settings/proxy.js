import PropTypes from 'prop-types';

const proxy = PropTypes.oneOfType([
  PropTypes.string,
  PropTypes.shape({
    ip: PropTypes.string,
    port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    username: PropTypes.string,
    password: PropTypes.string,
  }),
]);

export default proxy;
