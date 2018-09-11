import PropTypes from 'prop-types';

import profile from '../profiles/profile';
import taskErrors from './taskErrors';
import taskProduct from './taskProduct';

const task = PropTypes.shape({
  id: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
  ]),
  product: taskProduct,
  site: PropTypes.shape({
    name: PropTypes.string,
    url: PropTypes.string,
    supported: PropTypes.bool,
  }),
  profile,
  status: PropTypes.string,
  sizes: PropTypes.arrayOf(PropTypes.string),
  pairs: PropTypes.number,
  errors: taskErrors,
});

export default task;
