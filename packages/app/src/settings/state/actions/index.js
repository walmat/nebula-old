import makeActionCreator from '../../../store/creator';
import prefixer from '../../../store/reducers/prefixer';
import parseProductType from '../../../utils/parseProductType';

const sharedPrefix = '@@Settings';
const accountPrefix = '@@Account';
const webhookPrefix = '@@Webhook';
const shippingPrefix = '@@Shipping';

const sharedList = ['EDIT_SETTINGS'];
const accountList = ['ADD_ACCOUNT', 'DELETE_ACCOUNT', 'SELECT_ACCOUNT'];
const webhooksList = ['ADD_WEBHOOK', 'DELETE_WEBHOOK', 'SELECT_WEBHOOK'];
const shippingList = [
  'CLEAR_SHIPPING',
  'SETUP_SHIPPING',
  'FETCH_SHIPPING',
  'STOP_SHIPPING',
  'CLEANUP_SHIPPING',
];

export const sharedActionsList = ['@@Settings/EDIT_SETTINGS'];
export const accountActionsList = [
  '@@Account/ADD_ACCOUNT',
  '@@Account/DELETE_ACCOUNT',
  '@@Account/SELECT_ACCOUNT',
];
export const webhookActionsList = [
  '@@Webhook/ADD_WEBHOOK',
  '@@Webhook/DELETE_WEBHOOK',
  '@@Webhook/SELECT_WEBHOOK',
];
export const shippingActionsList = [
  '@@Shipping/CLEAR_SHIPPING',
  '@@Shipping/SETUP_SHIPPING',
  '@@Shipping/FETCH_SHIPPING',
  '@@Shipping/STOP_SHIPPING',
  '@@Shipping/CLEANUP_SHIPPING',
];

export const SHARED_ACTIONS = prefixer(sharedPrefix, sharedList);
export const ACCOUNT_ACTIONS = prefixer(accountPrefix, accountList);
export const WEBHOOK_ACTIONS = prefixer(webhookPrefix, webhooksList);
export const SHIPPING_ACTIONS = prefixer(shippingPrefix, shippingList);

const waitFor = ms => new Promise(resolve => setTimeout(resolve, ms));

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
  return window.Bridge.startShippingRatesRunner(copy);
};

const _stopShippingRequest = async () => window.Bridge.stopShippingRatesRunner();

const _saveShippingRates = makeActionCreator(SHIPPING_ACTIONS.FETCH_SHIPPING, 'response');
const _setupShipping = makeActionCreator(SHIPPING_ACTIONS.SETUP_SHIPPING, 'message');
const _cleanupShipping = makeActionCreator(SHIPPING_ACTIONS.CLEANUP_SHIPPING, 'message');
const _stopShipping = makeActionCreator(SHIPPING_ACTIONS.STOP_SHIPPING);

const editSettings = makeActionCreator(SHARED_ACTIONS.EDIT_SETTINGS, 'field', 'value', 'sites');
const addAccount = makeActionCreator(ACCOUNT_ACTIONS.ADD_ACCOUNT, 'account');
const deleteAccount = makeActionCreator(ACCOUNT_ACTIONS.DELETE_ACCOUNT, 'account');
const selectAccount = makeActionCreator(ACCOUNT_ACTIONS.SELECT_ACCOUNT, 'account');
const addWebhook = makeActionCreator(WEBHOOK_ACTIONS.ADD_WEBHOOK, 'webhook');
const deleteWebhook = makeActionCreator(WEBHOOK_ACTIONS.DELETE_WEBHOOK, 'webhook');
const selectWebhook = makeActionCreator(WEBHOOK_ACTIONS.SELECT_WEBHOOK, 'webhook');

const clearShipping = makeActionCreator(SHIPPING_ACTIONS.CLEAR_SHIPPING);

const fetchShipping = task => dispatch => {
  // Perform the request and handle the response
  dispatch(_setupShipping('Fetching...'));
  return _fetchShippingRequest(task)
    .then(async ({ rates, selectedRate }) => {
      dispatch(
        _saveShippingRates({
          id: task.profile.id,
          site: task.site,
          rates,
          selectedRate,
        }),
      );
      const isSingular = (rates.length && rates.length === 1) || false;
      dispatch(_cleanupShipping(`Fetched ${rates.length} ${isSingular ? 'rate' : 'rates'}`));
      await waitFor(500);
      dispatch(_cleanupShipping(`Saved to ${task.profile.profileName}`));
      await waitFor(1000);
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
  edit: editSettings,
  addAccount,
  deleteAccount,
  selectAccount,
  clearShipping,
  addWebhook,
  deleteWebhook,
  selectWebhook,
  fetchShipping,
  stopShipping,
};

// Field Edits
export const SETTINGS_FIELDS = {
  EDIT_ACCOUNT_NAME: 'EDIT_ACCOUNT_NAME',
  EDIT_ACCOUNT_USERNAME: 'EDIT_ACCOUNT_USERNAME',
  EDIT_ACCOUNT_PASSWORD: 'EDIT_ACCOUNT_PASSWORD',
  EDIT_WEBHOOK_NAME: 'EDIT_WEBHOOK_NAME',
  EDIT_WEBHOOK_URL: 'EDIT_WEBHOOK_URL',
  EDIT_PROXIES: 'EDIT_PROXIES',
  EDIT_ERROR_DELAY: 'EDIT_ERROR_DELAY',
  EDIT_MONITOR_DELAY: 'EDIT_MONITOR_DELAY',

  CREATE_ACCOUNT: 'CREATE_ACCOUNT',
  REMOVE_ACCOUNT: 'REMOVE_ACCOUNT',
  FETCH_SHIPPING_METHODS: 'FETCH_SHIPPING_METHODS',
  CLEAR_SHIPPING_FIELDS: 'CLEAR_SHIPPING_FIELDS',
  EDIT_SHIPPING_PRODUCT: 'EDIT_SHIPPING_PRODUCT',
  EDIT_SHIPPING_PROFILE: 'EDIT_SHIPPING_PROFILE',
  EDIT_SHIPPING_SITE: 'EDIT_SHIPPING_SITE',
};

// maps FIELDS -> state value
export const mapSettingsFieldToKey = {
  [SETTINGS_FIELDS.EDIT_ACCOUNT_NAME]: 'name',
  [SETTINGS_FIELDS.EDIT_ACCOUNT_USERNAME]: 'username',
  [SETTINGS_FIELDS.EDIT_ACCOUNT_PASSWORD]: 'password',
  [SETTINGS_FIELDS.EDIT_WEBHOOK_NAME]: 'name',
  [SETTINGS_FIELDS.EDIT_WEBHOOK_URL]: 'url',
  [SETTINGS_FIELDS.EDIT_PROXIES]: 'proxies',
  [SETTINGS_FIELDS.EDIT_MONITOR_DELAY]: 'monitor',
  [SETTINGS_FIELDS.EDIT_ERROR_DELAY]: 'error',
  [SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT]: 'product',
  [SETTINGS_FIELDS.EDIT_SHIPPING_PROFILE]: 'profile',
  [SETTINGS_FIELDS.EDIT_SHIPPING_SITE]: 'site',
};
