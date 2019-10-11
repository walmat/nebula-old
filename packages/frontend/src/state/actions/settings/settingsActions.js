import makeActionCreator from '../actionCreator';
import parseProductType from '../../../utils/parseProductType';

// Top level Actions
export const SETTINGS_ACTIONS = {
  EDIT: 'EDIT_SETTINGS',
  SAVE: 'SAVE_DEFAULTS',
  SAVE_ACCOUNT: 'SAVE_ACCOUNT',
  SELECT_ACCOUNT: 'SELECT_ACCOUNT',
  CLEAR_DEFAULTS: 'CLEAR_DEFAULTS',
  DELETE_ACCOUNT: 'DELETE_ACCOUNT',
  CLEAR_SHIPPING: 'CLEAR_SHIPPING',
  TEST: 'TEST_WEBHOOK',
  SETUP_SHIPPING: 'START_SHIPPING',
  FETCH_SHIPPING: 'FETCH_SHIPPING',
  STOP_SHIPPING: 'STOP_SHIPPING',
  CLEANUP_SHIPPING: 'CLEANUP_SHIPPING',
  ERROR: 'SETTINGS_HANDLE_ERROR',
};

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

const _saveShippingRates = makeActionCreator(SETTINGS_ACTIONS.FETCH_SHIPPING, 'response');
const _setupShipping = makeActionCreator(SETTINGS_ACTIONS.SETUP_SHIPPING);
const _cleanupShipping = makeActionCreator(SETTINGS_ACTIONS.CLEANUP_SHIPPING, 'success');
const _stopShipping = makeActionCreator(SETTINGS_ACTIONS.STOP_SHIPPING);

const editSettings = makeActionCreator(SETTINGS_ACTIONS.EDIT, 'field', 'value');
const saveAccount = makeActionCreator(SETTINGS_ACTIONS.SAVE_ACCOUNT, 'account');
const selectAccount = makeActionCreator(SETTINGS_ACTIONS.SELECT_ACCOUNT, 'account');
const saveDefaults = makeActionCreator(SETTINGS_ACTIONS.SAVE, 'defaults');
const deleteAccount = makeActionCreator(SETTINGS_ACTIONS.DELETE_ACCOUNT, 'account');
const clearDefaults = makeActionCreator(SETTINGS_ACTIONS.CLEAR_DEFAULTS);
const clearShipping = makeActionCreator(SETTINGS_ACTIONS.CLEAR_SHIPPING);
const testWebhook = makeActionCreator(SETTINGS_ACTIONS.TEST, 'hook', 'test_hook_type');
const handleError = makeActionCreator(SETTINGS_ACTIONS.ERROR, 'action', 'error');

const fetchShipping = task => dispatch => {
  // Perform the request and handle the response
  dispatch(_setupShipping());
  return _fetchShippingRequest(task)
    .then(({ rates, selectedRate }) => {
      console.log(rates, selectedRate);
      dispatch(
        _saveShippingRates({
          id: task.profile.id,
          site: task.site,
          rates,
          selectedRate,
        }),
      );
      dispatch(_cleanupShipping(true));
    })
    .catch(err => {
      dispatch(handleError(SETTINGS_ACTIONS.FETCH_SHIPPING, err));
      dispatch(_cleanupShipping(false));
    });
};

const stopShipping = () => dispatch =>
  _stopShippingRequest().then(
    () => dispatch(_stopShipping()),
    () => dispatch(_cleanupShipping(true)),
  );

export const settingsActions = {
  edit: editSettings,
  save: saveDefaults,
  saveAccount,
  selectAccount,
  deleteAccount,
  clearDefaults,
  clearShipping,
  test: testWebhook,
  fetch: fetchShipping,
  stop: stopShipping,
  error: handleError,
};

// Field Edits
export const SETTINGS_FIELDS = {
  EDIT_PROXIES: 'EDIT_PROXIES',
  EDIT_DISCORD: 'EDIT_DISCORD',
  EDIT_SLACK: 'EDIT_SLACK',
  EDIT_ERROR_DELAY: 'EDIT_ERROR_DELAY',
  EDIT_MONITOR_DELAY: 'EDIT_MONITOR_DELAY',
  EDIT_DEFAULT_PROFILE: 'EDIT_DEFAULT_PROFILE',
  EDIT_DEFAULT_SIZES: 'EDIT_DEFAULT_SIZES',
  SAVE_DEFAULTS: 'SAVE_DEFAULTS',
  SAVE_ACCOUNT: 'SAVE_ACCOUNT',
  CLEAR_DEFAULTS: 'CLEAR_DEFAULTS',
  CLEAR_ACCOUNT: 'CLEAR_ACCOUNT',
  EDIT_ACCOUNT_NAME: 'EDIT_ACCOUNT_NAME',
  EDIT_ACCOUNT_USERNAME: 'EDIT_ACCOUNT_USERNAME',
  EDIT_ACCOUNT_PASSWORD: 'EDIT_ACCOUNT_PASSWORD',
  FETCH_SHIPPING_METHODS: 'FETCH_SHIPPING_METHODS',
  CLEAR_SHIPPING_FIELDS: 'CLEAR_SHIPPING_FIELDS',
  EDIT_SHIPPING_PRODUCT: 'EDIT_SHIPPING_PRODUCT',
  EDIT_SHIPPING_RATE_NAME: 'EDIT_SHIPPING_RATE_NAME',
  EDIT_SHIPPING_PROFILE: 'EDIT_SHIPPING_PROFILE',
  EDIT_SHIPPING_SITE: 'EDIT_SHIPPING_SITE',
  EDIT_SHIPPING_USERNAME: 'EDIT_SHIPPING_USERNAME',
  EDIT_SHIPPING_PASSWORD: 'EDIT_SHIPPING_PASSWORD',
};

// SEE ../../middleware/settings/settingsAttributeValidationMiddleware LINE #26
export const mapSettingsFieldToKey = {
  [SETTINGS_FIELDS.EDIT_PROXIES]: 'proxies',
  [SETTINGS_FIELDS.EDIT_DISCORD]: 'discord',
  [SETTINGS_FIELDS.EDIT_SLACK]: 'slack',
  [SETTINGS_FIELDS.EDIT_MONITOR_DELAY]: 'monitorDelay',
  [SETTINGS_FIELDS.EDIT_ERROR_DELAY]: 'errorDelay',
  [SETTINGS_FIELDS.EDIT_DEFAULT_PROFILE]: 'profile',
  [SETTINGS_FIELDS.EDIT_DEFAULT_SIZES]: 'sizes',
  [SETTINGS_FIELDS.EDIT_ACCOUNT_NAME]: 'name',
  [SETTINGS_FIELDS.EDIT_ACCOUNT_USERNAME]: 'username',
  [SETTINGS_FIELDS.EDIT_ACCOUNT_PASSWORD]: 'password',
  [SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT]: 'product',
  [SETTINGS_FIELDS.EDIT_SHIPPING_PROFILE]: 'profile',
  [SETTINGS_FIELDS.EDIT_SHIPPING_SITE]: 'site',
};
