import makeActionCreator from '../ActionCreator';

// Top level Actions
export const SETTINGS_ACTIONS = {
    EDIT: 'EDIT_SETTINGS',
};

const editSettings = makeActionCreator(SETTINGS_ACTIONS.EDIT, 'id', 'field', 'value');

export const settingsActions = {
    edit: editSettings
};

// Field Edits
export const SETTINGS_FIELDS = {
    EDIT_PROXIES: 'EDIT_PROXIES'
};

export const mapProfileFieldToKey = {
    [SETTINGS_FIELDS.EDIT_PROXIES]: 'proxies'
};
