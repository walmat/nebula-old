import PropTypes from 'prop-types';

import defaultsErrors, { initialDefaultsErrorState } from './defaultsErrors';
import proxyErrors, { initialProxyErrorState } from './proxyErrors';

export const initialSettingsErrorState = {
  proxies: initialProxyErrorState,
  defaults: initialDefaultsErrorState,
  discord: null,
  slack: null,
};

const settingsErrors = PropTypes.shape({
  proxies: proxyErrors,
  defaults: defaultsErrors,
  discord: PropTypes.bool,
  slack: PropTypes.bool,
});

export default settingsErrors;
