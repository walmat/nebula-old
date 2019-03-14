import { parseURL } from 'whatwg-url';
import { SETTINGS_ACTIONS, mapSettingsFieldToKey, SETTINGS_FIELDS } from '../../actions';
import getAllSites from '../../../constants/getAllSites';
import { initialSettingsStates } from '../../../utils/definitions/settingsDefinitions';

export default function settingsReducer(state = initialSettingsStates.settings, action) {
  let change = {};
  if (action.type === SETTINGS_ACTIONS.EDIT) {
    switch (action.field) {
      case SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT: {
        change.shipping = {
          ...initialSettingsStates.shipping,
          product: {
            ...initialSettingsStates.shipping.product,
            raw: action.value || '',
          },
          errors: Object.assign({}, state.errors, action.errors),
        };
        if (!action.value || !action.value.startsWith('http')) {
          break;
        }
        const URL = parseURL(action.value);
        if (!URL || !URL.host) {
          break;
        }
        const newSite = getAllSites().find(s => URL.host === parseURL(s.value).host);
        if (!newSite || newSite.label === state.shipping.site.name) {
          break;
        }
        change.shipping = {
          ...change.shipping,
          site: {
            url: newSite.value,
            name: newSite.label,
            apiKey: newSite.apiKey,
            special: newSite.special || false,
            auth: newSite.auth,
          },
          username: null,
          password: null,
          errors: Object.assign({}, state.errors, action.errors),
        };
        break;
      }
      case SETTINGS_FIELDS.EDIT_SHIPPING_PROFILE:
      case SETTINGS_FIELDS.EDIT_SHIPPING_USERNAME:
      case SETTINGS_FIELDS.EDIT_SHIPPING_PASSWORD:
      case SETTINGS_FIELDS.EDIT_SHIPPING_SITE:
      case SETTINGS_FIELDS.EDIT_SHIPPING_RATE_NAME: {
        change = {
          shipping: {
            ...state.shipping,
            [mapSettingsFieldToKey[action.field]]: action.value,
          },
          errors: Object.assign({}, state.errors, action.errors),
        };
        break;
      }
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
        // TODO - check for valid `action.value` once validation middleware is setup
        if (window.Bridge) {
          window.Bridge.updateHook(action.value, 'discord');
        }
        change = {
          discord: action.value,
          errors: Object.assign({}, state.errors, action.errors),
        };
        break;
      }
      case SETTINGS_FIELDS.EDIT_SLACK: {
        // TODO - check for valid `a`ction.value` once validation middleware is setup
        if (window.Bridge) {
          window.Bridge.updateHook(action.value, 'slack');
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
  } else if (action.type === SETTINGS_ACTIONS.CLEAR_DEFAULTS) {
    change = {
      defaults: initialSettingsStates.defaults,
      errors: Object.assign({}, state.errors, action.errors),
    };
  } else if (action.type === SETTINGS_ACTIONS.FETCH_SHIPPING) {
    // TODO - setup reducer here
  } else if (action.type === SETTINGS_ACTIONS.CLEAR_SHIPPING) {
    change = {
      shipping: initialSettingsStates.shipping,
      errors: Object.assign({}, state.errors, action.errors),
    };
  } else if (action.type === SETTINGS_ACTIONS.TEST) {
    if (window.Bridge) {
      window.Bridge.sendWebhookTestMessage(action.hook, action.test_hook_type);
    }
  }
  return Object.assign({}, state, change);
}
