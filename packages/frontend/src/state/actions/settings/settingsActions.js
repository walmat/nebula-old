import makeActionCreator from '../actionCreator';

// Top level Actions
export const SETTINGS_ACTIONS = {
  EDIT: 'EDIT_SETTINGS',
  SAVE: 'SAVE_DEFAULTS',
  CLEAR_DEFAULTS: 'CLEAR_DEFAULTS',
  CLEAR_SHIPPING: 'CLEAR_SHIPPING',
  TEST: 'TEST_WEBHOOK',
  FETCH_SHIPPING: 'FETCH_SHIPPING',
};

const _fetchShippingRequest = async (product, profile, site) => {
  /**
   * TODO:
   * 1. login if needed
   * 2. create checkout
   * 3. submit customer info
   * 4. ATC
   * 5. fetch shipping rates
   */
};

const editSettings = makeActionCreator(SETTINGS_ACTIONS.EDIT, 'field', 'value');
const saveDefaults = makeActionCreator(SETTINGS_ACTIONS.SAVE, 'defaults');
const clearDefaults = makeActionCreator(SETTINGS_ACTIONS.CLEAR_DEFAULTS);
const _fetchShipping = makeActionCreator(SETTINGS_ACTIONS.FETCH_SHIPPING, 'shipping');
const clearShipping = makeActionCreator(SETTINGS_ACTIONS.CLEAR_SHIPPING);
const testWebhook = makeActionCreator(SETTINGS_ACTIONS.TEST, 'hook', 'test_hook_type');
const handleError = makeActionCreator(SETTINGS_ACTIONS.ERROR, 'action', 'error');

const fetchShipping = (product, profile, site) => dispatch =>
  _fetchShippingRequest(product, profile, site).then(
    rates => dispatch(_fetchShipping(rates)),
    error => dispatch(handleError(SETTINGS_ACTIONS.FETCH_SHIPPING, error)),
  );

export const settingsActions = {
  edit: editSettings,
  save: saveDefaults,
  clearDefaults,
  clearShipping,
  test: testWebhook,
  fetch: fetchShipping,
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
  [SETTINGS_FIELDS.EDIT_SHIPPING_PROFILE]: 'profile',
  [SETTINGS_FIELDS.EDIT_SHIPPING_SITE]: 'site',
  [SETTINGS_FIELDS.EDIT_SHIPPING_RATE_NAME]: 'name',
};
