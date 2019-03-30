import PropTypes from 'prop-types';

import proxy from './proxy';
import proxyErrors from './proxyErrors';
import defaults from './defaults';
import settingsErrors from './settingsErrors';
import shippingManager from './shippingManager';

const settings = PropTypes.shape({
  proxies: PropTypes.arrayOf(proxy),
  proxyErrors,
  defaults,
  shipping: shippingManager,
  monitordelay: PropTypes.number,
  errorDelay: PropTypes.number,
  discord: PropTypes.string,
  slack: PropTypes.string,
  errors: settingsErrors,
});

export default settings;
