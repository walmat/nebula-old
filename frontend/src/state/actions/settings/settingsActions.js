import makeActionCreator from '../actionCreator';

// Top level Actions
export const SETTINGS_ACTIONS = {
  EDIT: 'EDIT_SETTINGS',
  SAVE: 'SAVE_DEFAULTS',
};

const editSettings = makeActionCreator(SETTINGS_ACTIONS.EDIT, 'field', 'value');
const saveDefaults = makeActionCreator(SETTINGS_ACTIONS.SAVE, 'field', 'profile', 'sizes');

export const settingsActions = {
  edit: editSettings,
  save: saveDefaults,
};

// Field Edits
export const SETTINGS_FIELDS = {
  EDIT_PROXIES: 'EDIT_PROXIES',
  EDIT_DISCORD: 'EDIT_DISCORD',
  EDIT_SLACK: 'EDIT_SLACK',
  EDIT_DEFAULT_PROFILE: 'EDIT_DEFAULT_PROFILE',
  EDIT_DEFAULT_SIZES: 'EDIT_DEFAULT_SIZES',
  SAVE_DEFAULTS: 'SAVE_DEFAULTS',
};

// SEE ../../middleware/settings/settingsAttributeValidationMiddleware LINE #26
export const mapSettingsFieldToKey = {
  [SETTINGS_FIELDS.EDIT_PROXIES]: 'proxies',
  [SETTINGS_FIELDS.EDIT_DISCORD]: 'discord',
  [SETTINGS_FIELDS.EDIT_SLACK]: 'slack',
  [SETTINGS_FIELDS.EDIT_DEFAULT_PROFILE]: 'profile',
  [SETTINGS_FIELDS.EDIT_DEFAULT_SIZES]: 'sizes',
};
