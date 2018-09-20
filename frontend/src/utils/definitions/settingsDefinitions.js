import defaults, { initialDefaultState } from './settings/defaults';
import defaultsErrors, { initialDefaultsErrorState } from './settings/defaultsErrors';
import proxy, { initialProxyState } from './settings/proxy';
import proxyErrors, { initialProxyErrorState } from './settings/proxyErrors';
import settings, { initialSettingsState } from './settings/settings';
import settingsErrors, { initialSettingsErrorState } from './settings/settingsErrors';

export const initialSettingsStates = {
  defaults: initialDefaultState,
  defaultsErrors: initialDefaultsErrorState,
  settings: initialSettingsState,
  settingsErrors: initialSettingsErrorState,
  proxy: initialProxyState,
  proxyErrors: initialProxyErrorState,
};

export default {
  defaults,
  defaultsErrors,
  settings,
  settingsErrors,
  proxy,
  proxyErrors,
};
