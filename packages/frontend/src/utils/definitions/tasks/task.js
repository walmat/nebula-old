import PropTypes from 'prop-types';

import taskEdit, { initialTaskEditState } from './taskEdit';
import taskErrors, { initialTaskErrorState } from './taskErrors';
import taskProduct, { initialTaskProductState } from './taskProduct';
import taskSite, { initialTaskSiteState } from './taskSite';
import { initialSettingsState } from '../settings/settings';
import pDefns, { initialProfileStates } from '../profileDefinitions';

export const initialTaskState = {
  id: '',
  index: 0,
  product: initialTaskProductState,
  site: initialTaskSiteState,
  profile: initialProfileStates.profile,
  sizes: [],
  username: '',
  password: '',
  status: 'idle',
  output: '',
  errorDelay: initialSettingsState.errorDelay,
  monitorDelay: initialSettingsState.monitorDelay,
  errors: initialTaskErrorState,
  edits: initialTaskEditState,
};

const task = PropTypes.shape({
  id: PropTypes.string,
  index: PropTypes.number,
  product: taskProduct,
  site: taskSite,
  profile: pDefns.profile,
  username: PropTypes.string,
  password: PropTypes.string,
  status: PropTypes.string,
  errorDelay: PropTypes.number,
  monitorDelay: PropTypes.number,
  sizes: PropTypes.arrayOf(PropTypes.string),
  edits: taskEdit,
  errors: taskErrors,
});

export default task;
