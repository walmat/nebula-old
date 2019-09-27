import PropTypes from 'prop-types';

import taskEdit from './taskEdit';
import taskErrors from './taskErrors';
import taskProduct from './taskProduct';
import taskSite from './taskSite';
import pDefns from '../profileDefinitions';
import sDefns from '../settingsDefinitions';

const task = PropTypes.shape({
  id: PropTypes.string,
  index: PropTypes.number,
  product: taskProduct,
  site: taskSite,
  profile: pDefns.profile,
  account: sDefns.account,
  status: PropTypes.string,
  errorDelay: PropTypes.number,
  monitorDelay: PropTypes.number,
  discord: PropTypes.string,
  slack: PropTypes.string,
  size: PropTypes.string,
  edits: taskEdit,
  errors: taskErrors,
});

export default task;
