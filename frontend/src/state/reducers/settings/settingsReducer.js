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
    defaultProfile: null,
    defaultSizes: null,
    discord: null,
    slack: null,
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
      case SETTINGS_FIELDS.EDIT_DISCORD:
        change = {
          discord: action.value,
          errors: action.errors,
        };
        break;
      case SETTINGS_FIELDS.EDIT_SLACK:
        change = {
          slack: action.value,
          errors: action.errors,
        };
        break;
      case SETTINGS_FIELDS.EDIT_DEFAULT_PROFILE:
        change = {
          defaultProfile: action.value,
          errors: action.errors,
        };
        break;
      case SETTINGS_FIELDS.EDIT_DEFAULT_SIZES:
        console.log(action);
        change = {
          defaultSizes: action.value,
          errors: action.errors,
        };
        break;
      default:
        change = {};
    }
  } else if (action.type === SETTINGS_ACTIONS.SAVE) {
    switch (action.field) {
      case SETTINGS_FIELDS.SAVE_DEFAULTS:
        change = {
          defaults: {profile: action.profile, sizes: action.sizes },
          errors: action.errors,
        };
        break;
      default:
        change = {};
    }
  }

  return Object.assign({}, state, change);
}
