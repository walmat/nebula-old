import makeActionCreator from '../actionCreator';

// Top level Actions
export const SETTINGS_ACTIONS = {
  EDIT: 'EDIT_SETTINGS',
  SAVE: 'SAVE_DEFAULTS',
  CLEAR: 'CLEAR_DEFAULTS',
  TEST: 'TEST_WEBHOOK',
};

const editSettings = makeActionCreator(SETTINGS_ACTIONS.EDIT, 'field', 'value');
const saveDefaults = makeActionCreator(SETTINGS_ACTIONS.SAVE, 'defaults');
const clearDefaults = makeActionCreator(SETTINGS_ACTIONS.CLEAR);
const testWebhook = makeActionCreator(SETTINGS_ACTIONS.TEST, 'hook', 'opt');

export const settingsActions = {
  edit: editSettings,
  save: saveDefaults,
  clear: clearDefaults,
  test: testWebhook,
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
};
