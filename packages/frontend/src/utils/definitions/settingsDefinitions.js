import defaults from './settings/defaults';
import defaultsErrors from './settings/defaultsErrors';
import shippingManager from './settings/shippingManager';
import proxy from './settings/proxy';
import proxyErrors from './settings/proxyErrors';
import settings from './settings/settings';
import settingsErrors from './settings/settingsErrors';

export default {
  defaults,
  defaultsErrors,
  shipping: shippingManager,
  settings,
  settingsErrors,
  proxy,
  proxyErrors,
};
