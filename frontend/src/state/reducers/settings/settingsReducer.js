import {
  SETTINGS_ACTIONS,
  SETTINGS_FIELDS,
  mapSettingsFieldToKey,
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
      default:
        change = {
          [mapSettingsFieldToKey[action.field]]: action.value,
          errors: action.errors,
        };
    }
  } else if (action.type === SETTINGS_ACTIONS.SAVE) {
    switch (action.field) {
      case SETTINGS_FIELDS.SAVE_DEFAULTS:
        change = {
          defaults: { profile: action.profile, sizes: action.sizes },
          errors: action.errors,
        };
        break;
      default:
        change = {};
    }
  }

  return Object.assign({}, state, change);
}
