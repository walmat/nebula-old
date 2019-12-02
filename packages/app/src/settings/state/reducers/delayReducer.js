import {
  SHARED_ACTIONS,
  GLOBAL_ACTIONS,
  SETTINGS_FIELDS,
  mapSettingsFieldToKey,
} from '../../../store/actions';
import { Delays } from '../initial';

export default function delayReducer(state = Delays, action = {}) {
  const { type, field, value } = action;

  if (type === GLOBAL_ACTIONS.RESET) {
    return Delays;
  }

  if (type === SHARED_ACTIONS.EDIT_SETTINGS) {
    switch (field) {
      case SETTINGS_FIELDS.EDIT_ERROR_DELAY:
      case SETTINGS_FIELDS.EDIT_MONITOR_DELAY: {
        const num = parseInt(value || '0', 10);

        if (Number.isNaN(num)) {
          return state;
        }

        window.Bridge.changeDelay(num, mapSettingsFieldToKey[field]);
        return { ...state, [mapSettingsFieldToKey[field]]: num };
      }
      default:
        return state;
    }
  }

  return state;
}
