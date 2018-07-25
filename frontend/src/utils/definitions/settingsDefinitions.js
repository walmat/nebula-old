import PropTypes from 'prop-types';

import proxy from './settings/proxy';
import proxyErrors from './settings/proxyErrors';
import settingsErrors from './settings/settingsErrors';

export default {
  proxies: PropTypes.arrayOf(proxy),
  proxyErrors,
  errors: settingsErrors,
};
