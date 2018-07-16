import {
  SETTINGS_ACTIONS,
  SETTINGS_FIELDS,
} from '../../actions';

export const initialSettingsState = {
  proxies: [],
  errors: {
    proxies: [],
  },
};

export function settingsReducer(state = initialSettingsState, action) {
  let change = {};
  if (action.type === SETTINGS_ACTIONS.EDIT) {
    switch (action.field) {
      case SETTINGS_FIELDS.EDIT_PROXIES:
        change = {
          proxies: action.value,
        };
        break;
      default:
        change = {};
    }
  }

  change.errors = action.errors;

  return Object.assign({}, state, change);
}
