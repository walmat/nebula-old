import PropTypes from 'prop-types';

export const initialTaskErrorState = {
  product: null,
  site: null,
  profile: null,
  sizes: null,
  username: null,
  password: null,
};

const taskErrors = PropTypes.shape({
  product: PropTypes.bool,
  site: PropTypes.bool,
  profile: PropTypes.bool,
  sizes: PropTypes.bool,
  username: PropTypes.bool,
  password: PropTypes.bool,
});

export default taskErrors;
