import defaults, { initialDefaultState } from './settings/defaults';
import defaultsErrors, { initialDefaultsErrorState } from './settings/defaultsErrors';
import shippingManager, { initialShippingManagerState } from './settings/shippingManager';
import proxy, { initialProxyState } from './settings/proxy';
import proxyErrors, { initialProxyErrorState } from './settings/proxyErrors';
import settings, { initialSettingsState } from './settings/settings';
import settingsErrors, { initialSettingsErrorState } from './settings/settingsErrors';

export const initialSettingsStates = {
  defaults: initialDefaultState,
  defaultsErrors: initialDefaultsErrorState,
  shipping: initialShippingManagerState,
  settings: initialSettingsState,
  settingsErrors: initialSettingsErrorState,
  proxy: initialProxyState,
  proxyErrors: initialProxyErrorState,
};

export default {
  defaults,
  defaultsErrors,
  shipping: shippingManager,
  settings,
  settingsErrors,
  proxy,
  proxyErrors,
};
