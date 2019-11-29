import makeActionCreator from '../../../store/creator';
import parseProductType from '../../../utils/parseProductType';

// Top level Actions
export const SETTINGS_ACTIONS = {
  EDIT: 'EDIT_SETTINGS',
  ADD_ACCOUNT: 'SAVE_ACCOUNT',
  DELETE_ACCOUNT: 'DELETE_ACCOUNT',
  SELECT_ACCOUNT: 'SELECT_ACCOUNT',
  ADD_WEBHOOK: 'ADD_WEBHOOK',
  DELETE_WEBHOOK: 'DELETE_WEBHOOK',
  SELECT_WEBHOOK: 'SELECT_WEBHOOK',
  TEST_WEBHOOK: 'TEST_WEBHOOK',
  CLEAR_SHIPPING: 'CLEAR_SHIPPING',
  SETUP_SHIPPING: 'START_SHIPPING',
  FETCH_SHIPPING: 'FETCH_SHIPPING',
  STOP_SHIPPING: 'STOP_SHIPPING',
  CLEANUP_SHIPPING: 'CLEANUP_SHIPPING',
  ERROR: 'SETTINGS_HANDLE_ERROR',
};

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

// NOTE: we don't need to reduce anything from test..
// therefore... don't dispatch an action!
const testWebhook = webhook => {
  if (
    !webhook ||
    (webhook &&
      !/https:\/\/discordapp.com\/api\/webhooks\/[0-9]+\/[a-zA-Z-0-9]*|https:\/\/hooks\.slack\.com\/services\/[a-zA-Z0-9]+\/[a-zA-Z0-9]+\/[a-zA-Z-0-9]*/.test(
        webhook,
      ))
  ) {
    return;
  }

  window.Bridge.sendWebhookTestMessage(webhook);
};

const _stopShippingRequest = async () => window.Bridge.stopShippingRatesRunner();

const _saveShippingRates = makeActionCreator(SETTINGS_ACTIONS.FETCH_SHIPPING, 'response');
const _setupShipping = makeActionCreator(SETTINGS_ACTIONS.SETUP_SHIPPING, 'message');
const _cleanupShipping = makeActionCreator(SETTINGS_ACTIONS.CLEANUP_SHIPPING, 'message');
const _stopShipping = makeActionCreator(SETTINGS_ACTIONS.STOP_SHIPPING);

const editSettings = makeActionCreator(SETTINGS_ACTIONS.EDIT, 'field', 'value', 'sites');
const addAccount = makeActionCreator(SETTINGS_ACTIONS.ADD_ACCOUNT, 'account');
const deleteAccount = makeActionCreator(SETTINGS_ACTIONS.DELETE_ACCOUNT, 'account');
const selectAccount = makeActionCreator(SETTINGS_ACTIONS.SELECT_ACCOUNT, 'account');
const addWebhook = makeActionCreator(SETTINGS_ACTIONS.ADD_WEBHOOK, 'webhook');
const deleteWebhook = makeActionCreator(SETTINGS_ACTIONS.DELETE_WEBHOOK, 'webhook');
const selectWebhook = makeActionCreator(SETTINGS_ACTIONS.SELECT_WEBHOOK, 'webhook');

const clearShipping = makeActionCreator(SETTINGS_ACTIONS.CLEAR_SHIPPING);
const handleError = makeActionCreator(SETTINGS_ACTIONS.ERROR, 'action', 'error');

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
    .catch(err => {
      dispatch(handleError(SETTINGS_ACTIONS.FETCH_SHIPPING, err));
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
  testWebhook,
  fetchShipping,
  stopShipping,
  handleError,
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
