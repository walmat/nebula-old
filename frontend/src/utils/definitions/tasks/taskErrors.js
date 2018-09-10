import PropTypes from 'prop-types';

import taskProductErrors from './taskProductErrors';

const taskErrors = PropTypes.shape({
  product: taskProductErrors,
  site: PropTypes.bool,
  profile: PropTypes.bool,
  status: PropTypes.bool,
  sizes: PropTypes.bool,
  pairs: PropTypes.bool,
});

export default taskErrors;
