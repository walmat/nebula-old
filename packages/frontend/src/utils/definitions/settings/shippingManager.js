import PropTypes from 'prop-types';

import pDefns from '../profileDefinitions';
import shippingManagerErrors from './shippingManagerErrors';

const shippingManager = PropTypes.shape({
  name: PropTypes.string,
  profile: pDefns.profile,
  site: PropTypes.shape({
    name: PropTypes.string,
    url: PropTypes.string,
    supported: PropTypes.bool,
    apiKey: PropTypes.string,
    auth: PropTypes.bool,
  }),
  product: PropTypes.shape({
    raw: PropTypes.string,
    variant: PropTypes.string,
    pos_keywords: PropTypes.arrayOf(PropTypes.string),
    neg_keywords: PropTypes.arrayOf(PropTypes.string),
    url: PropTypes.string,
  }),
  username: PropTypes.string,
  password: PropTypes.string,
  errors: shippingManagerErrors,
});

export default shippingManager;
