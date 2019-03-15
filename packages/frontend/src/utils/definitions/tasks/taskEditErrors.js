import PropTypes from 'prop-types';

export const initialTaskEditErrorState = {
  product: null,
  sizes: null,
  profile: null,
  username: null,
  password: null,
  site: null,
};

const taskEditErrors = PropTypes.shape({
  product: PropTypes.bool,
  sizes: PropTypes.bool,
  profile: PropTypes.bool,
  username: PropTypes.bool,
  password: PropTypes.bool,
  site: PropTypes.bool,
});

export default taskEditErrors;
