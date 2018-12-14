import PropTypes from 'prop-types';

export const initialProxyState = {
  ip: '0.0.0.0',
  port: 8080,
  username: null,
  password: null,
};

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
