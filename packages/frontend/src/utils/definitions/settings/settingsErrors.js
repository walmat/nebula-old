import PropTypes from 'prop-types';

import defaultsErrors from './defaultsErrors';
import proxyErrors from './proxyErrors';
import shippingManagerErrors from './shippingManagerErrors';

const settingsErrors = PropTypes.shape({
  proxies: proxyErrors,
  defaults: defaultsErrors,
  shipping: shippingManagerErrors,
  discord: PropTypes.bool,
  slack: PropTypes.bool,
});

export default settingsErrors;
