import PropTypes from 'prop-types';

import defaultsErrors from './defaultsErrors';
import proxyErrors from './proxyErrors';

const settingsErrors = PropTypes.shape({
  proxies: proxyErrors,
  defaults: defaultsErrors,
  product: PropTypes.bool,
  name: PropTypes.bool,
  profile: PropTypes.bool,
  site: PropTypes.bool,
  username: PropTypes.bool,
  password: PropTypes.bool,
  discord: PropTypes.bool,
  slack: PropTypes.bool,
});

export default settingsErrors;
