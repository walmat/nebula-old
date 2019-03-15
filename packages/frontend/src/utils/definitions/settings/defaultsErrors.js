import PropTypes from 'prop-types';

export const initialDefaultsErrorState = {
  profile: null,
  sizes: null,
};

const defaultsErrors = PropTypes.shape({
  profile: PropTypes.bool,
  sizes: PropTypes.bool,
});

export default defaultsErrors;
