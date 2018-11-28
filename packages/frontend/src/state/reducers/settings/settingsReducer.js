import {
  SETTINGS_ACTIONS,
  mapSettingsFieldToKey,
  SETTINGS_FIELDS,
} from '../../actions';

import { initialSettingsStates } from '../../../utils/definitions/settingsDefinitions';

export default function settingsReducer(
  state = initialSettingsStates.settings,
  action,
) {
  let change = {};
  if (action.type === SETTINGS_ACTIONS.EDIT) {
    switch (action.field) {
      case SETTINGS_FIELDS.EDIT_DEFAULT_PROFILE:
      case SETTINGS_FIELDS.EDIT_DEFAULT_SIZES:
        change = {
          defaults: {
            ...state.defaults,
            [mapSettingsFieldToKey[action.field]]: action.value,
          },
          errors: Object.assign({}, state.errors, action.errors),
        };
        break;
      case SETTINGS_FIELDS.EDIT_ERROR_DELAY:
      case SETTINGS_FIELDS.EDIT_MONITOR_DELAY:
        const intValue = parseInt(action.value, 10);
        change = {
          [mapSettingsFieldToKey[action.field]]: intValue,
          errors: Object.assign({}, state.errors, action.errors),
        };
        break;
      default:
        change = {
          [mapSettingsFieldToKey[action.field]]: action.value,
          errors: Object.assign({}, state.errors, action.errors),
        };
    }
  } else if (action.type === SETTINGS_ACTIONS.SAVE) {
    change = {
      defaults: {
        ...state.defaults,
        profile: action.defaults.profile,
        sizes: action.defaults.sizes,
      },
      errors: Object.assign({}, state.errors, action.errors),
    };
  } else if (action.type === SETTINGS_ACTIONS.CLEAR) {
    change = {
      defaults: initialSettingsStates.defaults,
      errors: Object.assign({}, state.errors, action.errors),
    };
  }
  return Object.assign({}, state, change);
}