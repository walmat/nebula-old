import { SETTINGS_ACTIONS, SETTINGS_FIELDS, mapSettingsFieldToKey } from '../../../store/actions';
import { Delays } from '../initial';

export default function delayReducer(state = Delays, action) {
  if (action.type === SETTINGS_ACTIONS.EDIT) {
    switch (action.field) {
      case SETTINGS_FIELDS.EDIT_ERROR_DELAY:
      case SETTINGS_FIELDS.EDIT_MONITOR_DELAY: {
        const num = parseInt(action.value || '0', 10);

        if (Number.isNaN(num)) {
          return state;
        }

        window.Bridge.changeDelay(num, mapSettingsFieldToKey[action.field]);
        return { ...state, [mapSettingsFieldToKey[action.field]]: num };
      }
      default:
        return state;
    }
  }

  return state;
}
