import {
  SETTINGS_ACTIONS,
  mapSettingsFieldToKey,
} from '../../actions';

import { initialProfileStates } from '../../../utils/definitions/profileDefinitions';
import { initialSettingsStates } from '../../../utils/definitions/settingsDefinitions';

export default function settingsReducer(state = initialSettingsStates.settings, action) {
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
      defaults: initialSettingsStates.defaults,
      errors: action.errors,
    };
  }
  return Object.assign({}, state, change);
}
