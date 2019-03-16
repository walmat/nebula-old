import makeActionCreator from '../actionCreator';
import parseProductType from '../../../utils/parseProductType';

// Top level Actions
export const SETTINGS_ACTIONS = {
  EDIT: 'EDIT_SETTINGS',
  SAVE: 'SAVE_DEFAULTS',
  CLEAR_DEFAULTS: 'CLEAR_DEFAULTS',
  CLEAR_SHIPPING: 'CLEAR_SHIPPING',
  TEST: 'TEST_WEBHOOK',
  FETCH_SHIPPING: 'FETCH_SHIPPING',
  ERROR: 'SETTINGS_HANDLE_ERROR',
};

const _fetchShippingRequest = async shipping => {
  const copy = JSON.parse(JSON.stringify(shipping));
  console.log(copy);
  const parsedProduct = parseProductType(copy.product);
  console.log(parsedProduct);

  if (parsedProduct) {
    copy.product = parsedProduct;
    return { shipping: copy };
  }
  return { error: new Error('Invalid Shipping Structure') };
};

const _fetchShippingRates = async shipping =>
  // TODO - window.Bridge to start the shipping rate finding...
  new Promise((resolve, reject) => {
    if (shipping) resolve(shipping);
    reject(new Error('No Shipping Rates Found'));
  });

const _fetchShipping = makeActionCreator(SETTINGS_ACTIONS.FETCH_SHIPPING, 'response');

const editSettings = makeActionCreator(SETTINGS_ACTIONS.EDIT, 'field', 'value');
const saveDefaults = makeActionCreator(SETTINGS_ACTIONS.SAVE, 'defaults');
const clearDefaults = makeActionCreator(SETTINGS_ACTIONS.CLEAR_DEFAULTS);
const clearShipping = makeActionCreator(SETTINGS_ACTIONS.CLEAR_SHIPPING);
const testWebhook = makeActionCreator(SETTINGS_ACTIONS.TEST, 'hook', 'test_hook_type');
const handleError = makeActionCreator(SETTINGS_ACTIONS.ERROR, 'action', 'error');

const fetchShipping = shipping => async dispatch => {
  console.log(shipping);
  const res = await _fetchShippingRequest(shipping);
  console.log(res);

  if (res && res.error) {
    return dispatch(handleError(SETTINGS_ACTIONS.FETCH_SHIPPING, res.error));
  }

  if (res && res.shipping) {
    const rates = await _fetchShippingRates(res.shipping);
    if (!rates || rates.error) {
      dispatch(handleError(SETTINGS_ACTIONS.FETCH_SHIPPING, rates.error));
    }
    dispatch(_fetchShipping(rates));
  }
};

export const settingsActions = {
  edit: editSettings,
  save: saveDefaults,
  clearDefaults,
  clearShipping,
  test: testWebhook,
  fetch: fetchShipping,
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
