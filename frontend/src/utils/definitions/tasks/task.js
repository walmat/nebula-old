import PropTypes from 'prop-types';

import taskEdit, { initialTaskEditState } from './taskEdit';
import taskErrors, { initialTaskErrorState } from './taskErrors';
import taskProduct, { initialTaskProductState } from './taskProduct';
import taskSite, { initialTaskSiteState } from './taskSite';

import pDefns, { initialProfileStates } from '../profileDefinitions';

export const initialTaskState = {
  id: '',
  product: initialTaskProductState,
  site: initialTaskSiteState,
  profile: initialProfileStates.profile,
  sizes: [],
  username: null,
  password: null,
  status: 'idle',
  error_delay: null,
  refresh_delay: null,
  errors: initialTaskErrorState,
  edits: initialTaskEditState,
};

const task = PropTypes.shape({
  id: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
  ]),
  product: taskProduct,
  site: taskSite,
  profile: pDefns.profile,
  username: PropTypes.string,
  password: PropTypes.string,
  status: PropTypes.string,
  error_delay: PropTypes.number,
  refresh_delay: PropTypes.number,
  sizes: PropTypes.arrayOf(PropTypes.string),
  edits: taskEdit,
  errors: taskErrors,
});

export default task;
