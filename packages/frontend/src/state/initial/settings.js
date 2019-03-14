import { initialState } from '../migrators';

const { settings } = initialState;
const { defaults } = settings;
export default {
  defaults,
  defaultsErrors: settings.errors.defaults,
  settings,
  settingsErrors: settings.errors,
  proxy: {
    ip: null,
    port: null,
    username: null,
    password: null,
  },
  proxyErrors: [],
};
