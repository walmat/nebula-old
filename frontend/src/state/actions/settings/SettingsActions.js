import makeActionCreator from '../ActionCreator';

// Top level Actions
export const SETTINGS_ACTIONS = {
    ADD: 'ADD_SETTINGS',
    REMOVE: 'REMOVE_SETTINGS',
    EDIT: 'EDIT_SETTINGS',
};

const addSettings = makeActionCreator(SETTINGS_ACTIONS.ADD, 'settings');
const removeSettings = makeActionCreator(SETTINGS_ACTIONS.REMOVE, 'id');
const editSettings = makeActionCreator(SETTINGS_ACTIONS.EDIT, 'id', 'field', 'value');

export const settingsActions = {
    add: addSettings,
    remove: removeSettings,
    edit: editSettings
};

// Field Edits
export const SETTINGS_FIELDS = {
    EDIT_PROXIES: 'EDIT_PROXIES'
};

export const mapProfileFieldToKey = {
    [SETTINGS_FIELDS.EDIT_PROXIES]: 'proxies'
};
