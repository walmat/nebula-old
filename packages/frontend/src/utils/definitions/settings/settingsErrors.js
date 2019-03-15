import PropTypes from 'prop-types';

import defaultsErrors from './defaultsErrors';
import proxyErrors from './proxyErrors';

const settingsErrors = PropTypes.shape({
  proxies: proxyErrors,
  defaults: defaultsErrors,
  discord: PropTypes.bool,
  slack: PropTypes.bool,
});

export default settingsErrors;
