import {
  SETTINGS_ACTIONS,
  PROFILE_ACTIONS,
  mapSettingsFieldToKey,
  SETTINGS_FIELDS,
} from '../../../store/actions';
import {  } from '../initial';
import shippingReducer from './shippingReducer';

export default function settingsReducer(state = initialSettingsStates.settings, action) {
  console.log('settings reducer handling action: ', action);

  let change = {};
  if (action.type === SETTINGS_ACTIONS.EDIT) {
    switch (action.field) {
      case SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT:
      case SETTINGS_FIELDS.EDIT_SHIPPING_PROFILE:
      case SETTINGS_FIELDS.EDIT_SHIPPING_SITE:
        change = {
          shipping: shippingReducer(state.shipping, action),
        };
        break;
      case SETTINGS_FIELDS.EDIT_ERROR_DELAY:
      case SETTINGS_FIELDS.EDIT_MONITOR_DELAY: {
        const strValue = action.value || '0'; // If action.value is empty, we'll use 0
        const intValue = parseInt(strValue, 10);
        if (Number.isNaN(intValue)) {
          // action.value isn't a valid integer, so we do nothing
          break;
        }
        change = {
          [mapSettingsFieldToKey[action.field]]: intValue,
          errors: Object.assign({}, state.errors, action.errors),
        };
        if (window.Bridge) {
          window.Bridge.changeDelay(intValue, mapSettingsFieldToKey[action.field]);
        }
        break;
      }
      default: {
        change = {
          [mapSettingsFieldToKey[action.field]]: action.value,
          errors: Object.assign({}, state.errors, action.errors),
        };
      }
    }
  } else if (action.type === SETTINGS_ACTIONS.TEST) {
    if (
      !action ||
      !action.hook ||
      (action.hook &&
        !/https:\/\/discordapp.com\/api\/webhooks\/[0-9]+\/[a-zA-Z-0-9]*|https:\/\/hooks\.slack\.com\/services\/[a-zA-Z0-9]+\/[a-zA-Z0-9]+\/[a-zA-Z-0-9]*/.test(
          action.hook,
        ))
    ) {
      return Object.assign({}, state, change);
    }

    if (window.Bridge) {
      window.Bridge.sendWebhookTestMessage(action.hook, action.test_hook_type);
    }
  } else if (action.type === SETTINGS_ACTIONS.CLEAR_SHIPPING) {
    change.shipping = {
      ...initialSettingsStates.shipping,
      errors: Object.assign(
        {},
        state.shipping.errors,
        initialSettingsStates.settings.shipping.errors,
      ),
    };
  } else if (action.type === SETTINGS_ACTIONS.SETUP_SHIPPING) {
    change.shipping = {
      ...state.shipping,
      message: action.message,
      status: 'inprogress',
    };
  } else if (action.type === SETTINGS_ACTIONS.CLEANUP_SHIPPING) {
    change.shipping = {
      ...state.shipping,
      message: action.message,
      status: 'idle',
    };
  } else if (action.type === SETTINGS_ACTIONS.ERROR) {
    // TODO: Handle error
    console.error(`Error trying to perform: ${action.action}! ${action.error}`);
  }
  return Object.assign({}, state, change);
}
