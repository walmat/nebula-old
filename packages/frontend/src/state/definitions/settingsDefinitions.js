import defaults from './settings/defaults';
import defaultsErrors from './settings/defaultsErrors';
import accountManager, { account, list } from './settings/accountManager';
import shippingManager from './settings/shippingManager';
import shippingManagerErrors from './settings/shippingManagerErrors';
import proxy from './settings/proxy';
import proxyErrors from './settings/proxyErrors';
import settings from './settings/settings';
import settingsErrors from './settings/settingsErrors';

export default {
  defaults,
  defaultsErrors,
  account,
  accountList: list,
  accounts: accountManager,
  shipping: shippingManager,
  shippingErrors: shippingManagerErrors,
  settings,
  settingsErrors,
  proxy,
  proxyErrors,
};
