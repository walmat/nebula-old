import {
  SETTINGS_ACTIONS,
  mapSettingsFieldToKey,
} from '../../actions';

import { initialProfileStates } from '../../../utils/definitions/profileDefinitions';

export const initialSettingsState = {
  proxies: [],
  defaultProfile: initialProfileStates.profile,
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
    change = {
      defaults: { profile: action.defaults.defaultProfile, sizes: action.defaults.defaultSizes },
      errors: action.errors,
    };
  } else if (action.type === SETTINGS_ACTIONS.CLEAR) {
    change = {
      defaults: {},
      defaultProfile: initialProfileStates.profile,
      defaultSizes: [],
      errors: action.errors,
    };
  }
  return Object.assign({}, state, change);
}
