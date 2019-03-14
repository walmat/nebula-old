import PropTypes from 'prop-types';

import taskEdit from './taskEdit';
import taskErrors from './taskErrors';
import taskProduct from './taskProduct';
import taskSite from './taskSite';
import pDefns from '../profileDefinitions';

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
  discord: PropTypes.string,
  slack: PropTypes.string,
  sizes: PropTypes.arrayOf(PropTypes.string),
  edits: taskEdit,
  errors: taskErrors,
});

export default task;
