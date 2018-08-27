import {
  SETTINGS_ACTIONS,
  SETTINGS_FIELDS,
} from '../../actions';

import { initialProfileState } from '../profiles/profileReducer';

export const initialSettingsState = {
  proxies: [],
  defaultProfile: initialProfileState,
  defaultSizes: [],
  discord: '',
  slack: '',
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
          errors: action.errors,
        };
        break;
      default:
        change = {};
    }
  }

  return Object.assign({}, state, change);
}
