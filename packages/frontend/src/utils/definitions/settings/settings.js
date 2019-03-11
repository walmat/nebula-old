import PropTypes from 'prop-types';

import proxy from './proxy';
import proxyErrors from './proxyErrors';
import defaults, { initialDefaultState } from './defaults';
import shippingManager, { initialShippingManagerState } from './shippingManager';
import settingsErrors, { initialSettingsErrorState } from './settingsErrors';

export const initialSettingsState = {
  proxies: [],
  defaults: initialDefaultState,
  shipping: initialShippingManagerState,
  monitorDelay: 1500,
  errorDelay: 1500,
  discord: '',
  slack: '',
  errors: initialSettingsErrorState,
};

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
