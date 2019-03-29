import makeActionCreator from '../actionCreator';
import parseProductType from '../../../utils/parseProductType';

// Top level Actions
export const SETTINGS_ACTIONS = {
  EDIT: 'EDIT_SETTINGS',
  SAVE: 'SAVE_DEFAULTS',
  CLEAR_DEFAULTS: 'CLEAR_DEFAULTS',
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
const saveDefaults = makeActionCreator(SETTINGS_ACTIONS.SAVE, 'defaults');
const clearDefaults = makeActionCreator(SETTINGS_ACTIONS.CLEAR_DEFAULTS);
const clearShipping = makeActionCreator(SETTINGS_ACTIONS.CLEAR_SHIPPING);
const testWebhook = makeActionCreator(SETTINGS_ACTIONS.TEST, 'hook', 'test_hook_type');
const handleError = makeActionCreator(SETTINGS_ACTIONS.ERROR, 'action', 'error');

const fetchShipping = task => dispatch => {
  // Perform the request and handle the response
  dispatch(_setupShipping());
  return _fetchShippingRequest(task)
    .then(({ rates, selectedRate }) => {
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
    err => dispatch(handleError(SETTINGS_ACTIONS.STOP_SHIPPING, err)),
  );

export const settingsActions = {
  edit: editSettings,
  save: saveDefaults,
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
  CLEAR_DEFAULTS: 'CLEAR_DEFAULTS',
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
  [SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT]: 'product',
  [SETTINGS_FIELDS.EDIT_SHIPPING_RATE_NAME]: 'name',
  [SETTINGS_FIELDS.EDIT_SHIPPING_PROFILE]: 'profile',
  [SETTINGS_FIELDS.EDIT_SHIPPING_SITE]: 'site',
  [SETTINGS_FIELDS.EDIT_SHIPPING_USERNAME]: 'username',
  [SETTINGS_FIELDS.EDIT_SHIPPING_PASSWORD]: 'password',
};
