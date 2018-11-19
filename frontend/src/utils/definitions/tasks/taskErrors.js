import PropTypes from 'prop-types';

import taskProductErrors, {
  initialTaskProductErrorState,
} from './taskProductErrors';

export const initialTaskErrorState = {
  method: null,
  product: initialTaskProductErrorState,
  site: null,
  profile: null,
  sizes: null,
  username: null,
  password: null,
  status: null,
  errorDelay: null,
  monitorDelay: null,
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
  errorDelay: PropTypes.bool,
  monitorDelay: PropTypes.bool,
});

export default taskErrors;
