import {
  SETTINGS_ACTIONS,
  SERVER_ACTIONS,
  PROFILE_ACTIONS,
  mapSettingsFieldToKey,
  SETTINGS_FIELDS,
} from '../../actions';
import initialSettingsStates from '../../initial/settings';
import shippingReducer from './shippingReducer';

export default function settingsReducer(state = initialSettingsStates.settings, action) {
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
      case SETTINGS_FIELDS.EDIT_ACCOUNT_USERNAME: {
        change = {
          accounts: {
            ...state.accounts,
            currentAccount: {
              ...state.accounts.currentAccount,
              username: action.value,
            },
          },
        };
        break;
      }
      case SETTINGS_FIELDS.EDIT_ACCOUNT_PASSWORD: {
        change = {
          accounts: {
            ...state.accounts,
            currentAccount: {
              ...state.accounts.currentAccount,
              password: action.value,
            },
          },
        };
        break;
      }
      case SETTINGS_FIELDS.EDIT_ACCOUNT_NAME: {
        change = {
          accounts: {
            ...state.accounts,
            currentAccount: {
              ...state.accounts.currentAccount,
              name: action.value,
            },
          },
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
        const addedProxies = validIncomingProxies.filter(p => !validCurrentProxies.includes(p));

        // Remove these proxies (if we can)
        if (window.Bridge && removedProxies.length) {
          window.Bridge.removeProxies(removedProxies);
        } else if (window.Bridge && addedProxies.length) {
          window.Bridge.addProxies(addedProxies);
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
  } else if (action.type === SETTINGS_ACTIONS.SAVE_ACCOUNT) {
    change = {
      accounts: {
        ...state.accounts,
        list: [...state.accounts.list, action.account],
      },
    };
  } else if (action.type === SETTINGS_ACTIONS.SELECT_ACCOUNT) {
    const account = state.accounts.list.find(acc => acc.name === action.account.value);

    if (account) {
      change = {
        accounts: {
          ...state.accounts,
          selectedAccount: account,
        },
      };
    }
  } else if (action.type === SETTINGS_ACTIONS.CLEAR_DEFAULTS) {
    change = {
      defaults: initialSettingsStates.defaults,
      errors: Object.assign({}, state.errors, action.errors),
    };
  } else if (action.type === SETTINGS_ACTIONS.TEST) {
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
      status: 'inprogress',
    };
  } else if (action.type === SETTINGS_ACTIONS.CLEANUP_SHIPPING) {
    change.shipping = {
      ...state.shipping,
      status: 'idle',
    };
  } else if (action.type === PROFILE_ACTIONS.REMOVE) {
    if (!action.id) {
      return Object.assign({}, state, change);
    }

    if (state.shipping && state.shipping.profile && state.shipping.profile.id === action.id) {
      change.shipping = {
        ...state.shipping,
        profile: initialSettingsStates.shipping.profile,
      };
    }
  } else if (action.type === SETTINGS_ACTIONS.ERROR) {
    // TODO: Handle error
    console.error(`Error trying to perform: ${action.action}! ${action.error}`);
  } else if (action.type === SERVER_ACTIONS.GEN_PROXIES) {
    if (!action || !action.response || !action.done) {
      return Object.assign({}, state, change);
    }

    const { response } = action;

    const proxies = response.map(i => i.proxy);

    if (window.Bridge) {
      window.Bridge.addProxies(proxies);
    }

    change.proxies = proxies.concat(state.proxies);
  } else if (action.type === SERVER_ACTIONS.TERMINATE_PROXIES) {
    if (!action || !action.response) {
      return Object.assign({}, state, change);
    }

    const { response } = action;

    const proxies = response.map(p => p.proxy);

    if (window.Bridge) {
      window.Bridge.removeProxies(proxies);
    }

    change.proxies = state.proxies.filter(p => !proxies.includes(p));
  } else if (action.type === SERVER_ACTIONS.TERMINATE_PROXY) {
    if (!action || !action.response) {
      return Object.assign({}, state, change);
    }

    const {
      response: { proxy },
    } = action;

    if (window.Bridge) {
      window.Bridge.removeProxies([proxy]);
    }

    change.proxies = state.proxies.filter(p => p !== proxy);
  }
  return Object.assign({}, state, change);
}
