import makeActionCreator from '../../../store/creator';
import prefixer from '../../../store/reducers/prefixer';
import parseProductType from '../../../utils/parseProductType';

const delaysPrefix = '@@Delays';
const proxiesPrefix = '@@Proxies';
const accountPrefix = '@@Account';
const webhookPrefix = '@@Webhook';
const shippingPrefix = '@@Shipping';

const delaysList = ['EDIT_DELAYS'];
const proxiesList = ['EDIT_PROXIES'];
const accountList = ['EDIT_ACCOUNT', 'CREATE_ACCOUNT', 'DELETE_ACCOUNT', 'SELECT_ACCOUNT'];
const webhooksList = ['EDIT_WEBHOOK', 'CREATE_WEBHOOK', 'DELETE_WEBHOOK', 'SELECT_WEBHOOK'];
const shippingList = [
  'EDIT_SHIPPING',
  'CLEAR_SHIPPING',
  'SETUP_SHIPPING',
  'FETCH_SHIPPING',
  'STOP_SHIPPING',
  'CLEANUP_SHIPPING',
];

export const delaysActionsList = ['@@Delays/EDIT_DELAYS'];
export const proxiesActionsList = ['@@Proxies/EDIT_PROXIES'];

export const accountActionsNeededForTasks = ['@@Account/DELETE_ACCOUNT'];
export const accountActionsList = [
  '@@Account/EDIT_ACCOUNT',
  '@@Account/CREATE_ACCOUNT',
  '@@Account/DELETE_ACCOUNT',
  '@@Account/SELECT_ACCOUNT',
];
export const webhookActionsList = [
  '@@Webhook/EDIT_WEBHOOK',
  '@@Webhook/CREATE_WEBHOOK',
  '@@Webhook/DELETE_WEBHOOK',
  '@@Webhook/SELECT_WEBHOOK',
];
export const shippingActionsList = [
  '@@Shipping/EDIT_SHIPPING',
  '@@Shipping/CLEAR_SHIPPING',
  '@@Shipping/SETUP_SHIPPING',
  '@@Shipping/FETCH_SHIPPING',
  '@@Shipping/STOP_SHIPPING',
  '@@Shipping/CLEANUP_SHIPPING',
];

export const DELAYS_ACTIONS = prefixer(delaysPrefix, delaysList);
export const PROXIES_ACTIONS = prefixer(proxiesPrefix, proxiesList);
export const ACCOUNT_ACTIONS = prefixer(accountPrefix, accountList);
export const WEBHOOK_ACTIONS = prefixer(webhookPrefix, webhooksList);
export const SHIPPING_ACTIONS = prefixer(shippingPrefix, shippingList);

// Async handler to start the shipping rates runner
const _fetchShippingRequest = async task => {
  const copy = JSON.parse(JSON.stringify(task));

  if (copy.product && copy.product.raw.startsWith('shopify-')) {
    const titleMatch = copy.product.raw.match(/shopify-(.*)-/);
    const priceMatch = copy.product.raw.match(/shopify-.*-(.*)/);

    if (
      !titleMatch ||
      !priceMatch ||
      (titleMatch && !titleMatch.length) ||
      (priceMatch && !priceMatch.length)
    ) {
      throw new Error('Invalid prefetched data!');
    }

    const [, title] = titleMatch;
    const [, price] = priceMatch;

    return {
      rates: [{ title: decodeURIComponent(title), price, id: copy.product.raw }],
      selectedRate: { id: copy.product.raw, price, title: decodeURIComponent(title) },
    };
  }

  const parsedProduct = parseProductType(copy.product);

  if (!parsedProduct) {
    throw new Error('Unable to parse product information!');
  }

  if (!window.Bridge) {
    throw new Error('Bridge has not been injected!');
  }
  copy.product = parsedProduct;
  return window.Bridge.startShippingRateTask(copy);
};

const _stopShippingRequest = async () => window.Bridge.stopShippingRatesRunner();

const _saveShippingRates = makeActionCreator(SHIPPING_ACTIONS.FETCH_SHIPPING, 'response');
const _setupShipping = makeActionCreator(SHIPPING_ACTIONS.SETUP_SHIPPING, 'message');
const _cleanupShipping = makeActionCreator(SHIPPING_ACTIONS.CLEANUP_SHIPPING, 'message');
const _stopShipping = makeActionCreator(SHIPPING_ACTIONS.STOP_SHIPPING);

const editAccount = makeActionCreator(ACCOUNT_ACTIONS.EDIT_ACCOUNT, 'field', 'value');
const createAccount = makeActionCreator(ACCOUNT_ACTIONS.CREATE_ACCOUNT, 'account');
const deleteAccount = makeActionCreator(ACCOUNT_ACTIONS.DELETE_ACCOUNT, 'account');
const selectAccount = makeActionCreator(ACCOUNT_ACTIONS.SELECT_ACCOUNT, 'account');

const editWebhook = makeActionCreator(WEBHOOK_ACTIONS.EDIT_WEBHOOK, 'field', 'value');
const createWebhook = makeActionCreator(WEBHOOK_ACTIONS.CREATE_WEBHOOK, 'webhook');
const deleteWebhook = makeActionCreator(WEBHOOK_ACTIONS.DELETE_WEBHOOK, 'webhook');
const selectWebhook = makeActionCreator(WEBHOOK_ACTIONS.SELECT_WEBHOOK, 'webhook');

const editShipping = makeActionCreator(SHIPPING_ACTIONS.EDIT_SHIPPING, 'field', 'value', 'sites');
const clearShipping = makeActionCreator(SHIPPING_ACTIONS.CLEAR_SHIPPING);

const editDelays = makeActionCreator(DELAYS_ACTIONS.EDIT_DELAYS, 'field', 'value');
const editProxies = makeActionCreator(PROXIES_ACTIONS.EDIT_PROXIES, 'field', 'value');

const fetchShipping = task => dispatch => {
  // Perform the request and handle the response
  dispatch(_setupShipping('Fetching...'));
  return _fetchShippingRequest(task)
    .then(async ({ rates, selectedRate }) => {
      dispatch(
        _saveShippingRates({
          id: task.profile.id,
          store: task.store,
          rates,
          selectedRate,
        }),
      );
      dispatch(_cleanupShipping('Fetch rates'));
    })
    .catch(() => {
      dispatch(_cleanupShipping('Error!'));
    });
};

const stopShipping = () => dispatch =>
  _stopShippingRequest().then(
    () => dispatch(_stopShipping()),
    () => dispatch(_cleanupShipping('Fetch')),
  );

export const settingsActions = {
  editAccount,
  createAccount,
  deleteAccount,
  selectAccount,

  editShipping,
  clearShipping,
  fetchShipping,
  stopShipping,

  editWebhook,
  createWebhook,
  deleteWebhook,
  selectWebhook,

  editDelays,
  editProxies,
};

// Field Edits
export const SETTINGS_FIELDS = {
  CREATE_ACCOUNT: 'CREATE_ACCOUNT',
  REMOVE_ACCOUNT: 'REMOVE_ACCOUNT',
  EDIT_ACCOUNT_NAME: 'EDIT_ACCOUNT_NAME',
  EDIT_ACCOUNT_USERNAME: 'EDIT_ACCOUNT_USERNAME',
  EDIT_ACCOUNT_PASSWORD: 'EDIT_ACCOUNT_PASSWORD',

  EDIT_WEBHOOK_NAME: 'EDIT_WEBHOOK_NAME',
  EDIT_WEBHOOK_URL: 'EDIT_WEBHOOK_URL',

  EDIT_PROXIES_NAME: 'EDIT_PROXIES_NAME',
  EDIT_PROXIES: 'EDIT_PROXIES',

  EDIT_MONITOR_DELAY: 'EDIT_MONITOR_DELAY',

  FETCH_SHIPPING_METHODS: 'FETCH_SHIPPING_METHODS',
  CLEAR_SHIPPING_FIELDS: 'CLEAR_SHIPPING_FIELDS',
  EDIT_SHIPPING_PRODUCT: 'EDIT_SHIPPING_PRODUCT',
  EDIT_SHIPPING_PROFILE: 'EDIT_SHIPPING_PROFILE',
  EDIT_SHIPPING_STORE: 'EDIT_SHIPPING_STORE',
};

// maps FIELDS -> state value
export const mapSettingsFieldToKey = {
  [SETTINGS_FIELDS.EDIT_ACCOUNT_NAME]: 'name',
  [SETTINGS_FIELDS.EDIT_ACCOUNT_USERNAME]: 'username',
  [SETTINGS_FIELDS.EDIT_ACCOUNT_PASSWORD]: 'password',
  [SETTINGS_FIELDS.EDIT_WEBHOOK_NAME]: 'name',
  [SETTINGS_FIELDS.EDIT_WEBHOOK_URL]: 'url',
  [SETTINGS_FIELDS.EDIT_PROXIES_NAME]: 'name',
  [SETTINGS_FIELDS.EDIT_PROXIES]: 'proxies',
  [SETTINGS_FIELDS.EDIT_MONITOR_DELAY]: 'monitor',
  [SETTINGS_FIELDS.EDIT_ERROR_DELAY]: 'error',
  [SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT]: 'product',
  [SETTINGS_FIELDS.EDIT_SHIPPING_PROFILE]: 'profile',
  [SETTINGS_FIELDS.EDIT_SHIPPING_SITE]: 'site',
};
