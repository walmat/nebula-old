import PropTypes from 'prop-types';

import taskProductErrors, { initialTaskProductErrorState } from './taskProductErrors';

export const initialTaskErrorState = {
  method: null,
  product: initialTaskProductErrorState,
  site: null,
  profile: null,
  sizes: null,
  username: null,
  password: null,
  status: null,
  error_delay: null,
  refresh_delay: null,
};

const taskErrors = PropTypes.shape({
  method: PropTypes.bool,
  product: taskProductErrors,
  site: PropTypes.bool,
  profile: PropTypes.bool,
  status: PropTypes.bool,
  sizes: PropTypes.bool,
  username: PropTypes.bool,
  password: PropTypes.bool,
  error_delay: PropTypes.bool,
  refresh_delay: PropTypes.bool,
});

export default taskErrors;
