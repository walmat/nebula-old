import {SETTINGS_ACTIONS, SETTINGS_FIELDS} from '../../Actions';

export const initialSettingsState = {
    proxies: {}
};

export function settingsReducer(state = initialSettingsState, action) {
    let change = {};
    if (action.type === SETTINGS_ACTIONS.EDIT) {
        switch (action.field) {
            case SETTINGS_FIELDS.EDIT_PROXIES:
                change = {
                    proxies: action.value.split(/\r?\n/)
                };
                break;
            default:
                change = {};
                break;
        }
    }

    console.log(change, action);

    change.errors = action.errors;

    return Object.assign({}, state, change);
}