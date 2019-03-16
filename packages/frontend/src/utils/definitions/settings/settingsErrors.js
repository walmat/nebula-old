import PropTypes from 'prop-types';

import defaultsErrors, { initialDefaultsErrorState } from './defaultsErrors';
import proxyErrors, { initialProxyErrorState } from './proxyErrors';

export const initialSettingsErrorState = {
  proxies: initialProxyErrorState,
  defaults: initialDefaultsErrorState,
  product: null,
  name: null,
  profile: null,
  site: null,
  username: null,
  password: null,
  discord: null,
  slack: null,
};

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
