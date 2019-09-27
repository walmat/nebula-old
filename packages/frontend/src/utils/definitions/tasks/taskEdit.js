import PropTypes from 'prop-types';

import taskProduct from './taskProduct';
import taskSite from './taskSite';
import taskEditErrors from './taskEditErrors';
import pDefns from '../profileDefinitions';
import sDefns from '../settingsDefinitions';

const taskEdit = PropTypes.shape({
  product: taskProduct,
  sizes: PropTypes.arrayOf(PropTypes.string),
  site: taskSite,
  profile: pDefns.profile,
  account: sDefns.account,
  errors: taskEditErrors,
});

export default taskEdit;
