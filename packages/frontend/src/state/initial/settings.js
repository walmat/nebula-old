import { initialState } from '../migrators';

const { settings } = initialState;
const { defaults, shipping } = settings;
export default {
  defaults,
  defaultsErrors: settings.errors.defaults,
  settings,
  settingsErrors: settings.errors,
  shipping,
  shippingErrors: settings.errors.shipping,
  proxy: {
    ip: null,
    port: null,
    username: null,
    password: null,
  },
  proxyErrors: [],
};
