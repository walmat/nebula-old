import PropTypes from 'prop-types';

import profile from '../profiles/profile';
import taskErrors from './taskErrors';

const task = PropTypes.shape({
  id: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
  ]),
  sku: PropTypes.string,
  profile,
  status: PropTypes.string,
  sizes: PropTypes.arrayOf(PropTypes.string),
  pairs: PropTypes.number,
  errors: taskErrors,
});

export default task;
