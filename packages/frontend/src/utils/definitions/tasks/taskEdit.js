import PropTypes from 'prop-types';

import taskProduct from './taskProduct';
import taskSite from './taskSite';
import taskEditErrors, { initialTaskEditErrorState } from './taskEditErrors';
import pDefns from '../profileDefinitions';

export const initialTaskEditState = {
  product: null,
  sizes: null,
  profile: null,
  username: null,
  password: null,
  site: null,
  errors: initialTaskEditErrorState,
};

const taskEdit = PropTypes.shape({
  product: taskProduct,
  sizes: PropTypes.arrayOf(PropTypes.string),
  site: taskSite,
  profile: pDefns.profile,
  username: PropTypes.string,
  password: PropTypes.string,
  errors: taskEditErrors,
});

export default taskEdit;
