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
  console.log(action);
  if (action.type === SETTINGS_ACTIONS.EDIT) {
    switch (action.field) {
      default:
        change = {
          [mapSettingsFieldToKey[action.field]]: action.value,
          errors: action.errors,
        };
    }
  } else if (action.type === SETTINGS_ACTIONS.SAVE) {
    change = {
      defaults: { profile: action.defaults.defaultProfile, sizes: action.defaults.defaultSizes },
      errors: action.errors,
    };
  } else if (action.type === SETTINGS_ACTIONS.CLEAR) {
    change = {
      defaults: {},
      defaultProfile: initialProfileState,
      defaultSizes: [],
      errors: action.errors,
    };
  }
  return Object.assign({}, state, change);
}
