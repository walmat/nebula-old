import { SETTINGS_ACTIONS, mapSettingsFieldToKey, SETTINGS_FIELDS } from '../../actions';

import { initialSettingsStates } from '../../../utils/definitions/settingsDefinitions';

export default function settingsReducer(state = initialSettingsStates.settings, action) {
  let change = {};
  if (action.type === SETTINGS_ACTIONS.EDIT) {
    switch (action.field) {
      case SETTINGS_FIELDS.EDIT_DEFAULT_PROFILE:
      case SETTINGS_FIELDS.EDIT_DEFAULT_SIZES: {
        let useKey = 'useProfile';
        if (action.field === SETTINGS_FIELDS.EDIT_DEFAULT_SIZES) {
          useKey = 'useSizes';
        }
        change = {
          defaults: {
            ...state.defaults,
            [mapSettingsFieldToKey[action.field]]: action.value,
            [useKey]: true,
          },
          errors: Object.assign({}, state.errors, action.errors),
        };
        break;
      }
      case SETTINGS_FIELDS.EDIT_ERROR_DELAY:
      case SETTINGS_FIELDS.EDIT_MONITOR_DELAY: {
        const intValue = parseInt(action.value, 10);
        change = {
          [mapSettingsFieldToKey[action.field]]: intValue,
          errors: Object.assign({}, state.errors, action.errors),
        };
        break;
      }
      case SETTINGS_FIELDS.EDIT_PROXIES: {
        // Get a list of valid current proxies
        const validCurrentProxies = state.proxies.filter(
          (_, idx) => !state.errors.proxies || !state.errors.proxies.includes(idx),
        );
        // Get a list of valid proxies that are incoming
        const validIncomingProxies = action.value.filter(
          (_, idx) => !action.errors.proxies || !action.errors.proxies.includes(idx),
        );
        // Get a list of valid removed proxies (proxies that aren't in the incoming valid proxies)
        const removedProxies = validCurrentProxies.filter(p => !validIncomingProxies.includes(p));

        // Remove these proxies (if we can)
        if (window.Bridge && removedProxies.length) {
          window.Bridge.removeProxies(removedProxies);
        }

        const errors = {
          ...state.errors,
          ...action.errors,
        };
        // Force the proxy errors to be cleared if we don't have any incoming errors
        if (!action.errors.proxies) {
          errors.proxies = [];
        }

        change = {
          proxies: action.value,
          errors,
        };
        break;
      }
      case SETTINGS_FIELDS.EDIT_DISCORD: {
        // TODO - check for errors object once middleware is setup
        if (window.Bridge) {
          window.Bridge.updateWebhook(action.value, 'discord');
        }
        change = {
          discord: action.value,
          errors: Object.assign({}, state.errors, action.errors),
        };
        break;
      }
      case SETTINGS_FIELDS.EDIT_SLACK: {
        // TODO - check for errors object once middleware is setup
        if (window.Bridge) {
          window.Bridge.updateWebhook(action.value, 'slack');
        }
        change = {
          slack: action.value,
          errors: Object.assign({}, state.errors, action.errors),
        };
        break;
      }
      default: {
        change = {
          [mapSettingsFieldToKey[action.field]]: action.value,
          errors: Object.assign({}, state.errors, action.errors),
        };
      }
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
  } else if (action.type === SETTINGS_ACTIONS.UPDATE) {
    if (window.Bridge) {
      window.Bridge.updateWebhook(action.hook, action.opt);
    }
  } else if (action.type === SETTINGS_ACTIONS.TEST) {
    if (window.Bridge) {
      window.Bridge.testWebhook(action.opt);
    }
  }
  return Object.assign({}, state, change);
}
