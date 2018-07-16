import PropTypes from 'prop-types';

import profile from '../profiles/profile';

const task = PropTypes.shape({
  id: PropTypes.string,
  sku: PropTypes.string,
  profile,
  sizes: PropTypes.string,
  pairs: PropTypes.string,
  errors: PropTypes.shape({
    sku: PropTypes.bool,
    profile: PropTypes.bool,
    sizes: PropTypes.bool,
    pairs: PropTypes.bool,
  }),
});

export default task;
