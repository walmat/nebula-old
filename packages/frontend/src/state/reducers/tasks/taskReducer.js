import { parseURL } from 'whatwg-url';
import { PROFILE_ACTIONS, TASK_ACTIONS, TASK_FIELDS, mapTaskFieldsToKey } from '../../actions';
import initialTaskStates from '../../initial/tasks';
import PLATFORMS from '../../../constants/platforms';
import TASK_TYPES from '../../../constants/taskTypes';
import {
  SETTINGS_ACTIONS,
  SETTINGS_FIELDS,
  mapSettingsFieldToKey,
} from '../../actions/settings/settingsActions';

const siteToPlatform = url => {
  if (/supreme/i.test(url)) {
    return PLATFORMS.Supreme;
  }

  // TODO: more checks for other platforms here...
  return PLATFORMS.Shopify;
};

export function taskReducer(state = initialTaskStates.task, action) {
  let change = {};
  if (action.type === TASK_ACTIONS.EDIT) {
    // Check if we are editing a new task or an existing one
    if (!action.id) {
      if (!action.field) {
        return Object.assign({}, state);
      }
      switch (action.field) {
        case TASK_FIELDS.EDIT_PRODUCT: {
          change = {
            product: {
              ...state.product,
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
          let newSite;
          const { sites } = action;

          sites.forEach(category => {
            const exists = category.options.find(s => URL.host.includes(s.value.split('/')[2]));
            if (exists) {
              newSite = exists;
            }
          });

          if (!newSite || newSite.label === state.site.name) {
            break;
          }
          change = {
            ...change,
            site: {
              url: newSite.value,
              name: newSite.label,
              apiKey: newSite.apiKey,
              special: newSite.special || false,
              auth: newSite.auth,
            },
            platform: siteToPlatform(newSite.value),
            errors: Object.assign({}, state.errors, action.errors),
          };
          break;
        }
        case TASK_FIELDS.EDIT_SITE: {
          if (action.value) {
            if (state.site && action.value.name && action.value.name === state.site.name) {
              break;
            }
            change = {
              platform: siteToPlatform(action.value.url),
              site: action.value,
              errors: Object.assign({}, state.errors, action.errors),
            };
          } else {
            change = {
              site: initialTaskStates.site,
              errors: Object.assign({}, state.errors, action.errors),
            };
          }
          break;
        }
        case TASK_FIELDS.EDIT_SIZES: {
          change = {
            size: action.value,
            chosenSize: action.value,
            errors: Object.assign({}, state.errors, action.errors),
          };
          break;
        }
        case TASK_FIELDS.EDIT_TASK_TYPE: {
          switch (state.type) {
            case TASK_TYPES.SAFE: {
              change = {
                type: TASK_TYPES.FAST,
              };
              break;
            }
            case TASK_TYPES.FAST: {
              change = {
                type: TASK_TYPES.SAFE,
              };
              break;
            }
            // case TASK_TYPES.FAST: {
            //   change = {
            //     type: TASK_TYPES.CART,
            //   };
            //   break;
            // }
            // case TASK_TYPES.CART: {
            //   change = {
            //     type: TASK_TYPES.SAFE,
            //   };
            //   break;
            // }
            default: {
              change = {
                type: TASK_TYPES.SAFE,
              };
              break;
            }
          }
          break;
        }
        case TASK_FIELDS.TOGGLE_CAPTCHA: {
          change = {
            forceCaptcha: !state.forceCaptcha,
            errors: Object.assign({}, state.errors, action.errors),
          };
          break;
        }
        case TASK_FIELDS.TOGGLE_RANDOM_IN_STOCK: {
          change = {
            product: {
              ...state.product,
              randomInStock: !state.product.randomInStock,
            },
            errors: Object.assign({}, state.errors, action.errors),
          };
          break;
        }
        case TASK_FIELDS.TOGGLE_ONE_CHECKOUT: {
          change = {
            oneCheckout: !state.oneCheckout,
            errors: Object.assign({}, state.errors, action.errors),
          };
          break;
        }
        case TASK_FIELDS.TOGGLE_RESTOCK_MODE: {
          change = {
            restockMode: !state.restockMode,
            errors: Object.assign({}, state.errors, action.errors),
          };
          break;
        }
        case TASK_FIELDS.EDIT_TASK_ACCOUNT: {
          change = {
            account: action.value,
            errors: Object.assign({}, state.errors, action.errors),
          };
          break;
        }
        case TASK_FIELDS.EDIT_TASK_CATEGORY: {
          change = {
            category: action.value,
            errors: Object.assign({}, state.errors, action.errors),
          };
          break;
        }
        case TASK_FIELDS.EDIT_PRODUCT_VARIATION: {
          change = {
            product: {
              ...state.product,
              variation: action.value,
            },
            errors: Object.assign({}, state.errors, action.errors),
          };
          break;
        }
        case TASK_FIELDS.EDIT_CHECKOUT_DELAY: {
          const strValue = action.value || ''; // If action.value is empty, we'll use 0
          const amount = parseInt(strValue, 10);

          change = {
            checkoutDelay: amount,
            errors: Object.assign({}, state.errors, action.errors),
          };
          break;
        }
        case TASK_FIELDS.EDIT_AMOUNT: {
          const strValue = action.value || ''; // If action.value is empty, we'll use 0
          const amount = parseInt(strValue, 10);

          change = {
            amount,
            errors: Object.assign({}, state.errors, action.errors),
          };
          break;
        }
        default: {
          if (!mapTaskFieldsToKey[action.field]) {
            break;
          }

          change = {
            [mapTaskFieldsToKey[action.field]]:
              action.value || initialTaskStates.task[mapTaskFieldsToKey[action.field]],
            errors: Object.assign({}, state.errors, action.errors),
          };
        }
      }
    } else {
      if (!action.field) {
        return Object.assign({}, state);
      }
      // If we are editing an existing task, only perform the change on valid edit fields
      switch (action.field) {
        case TASK_FIELDS.EDIT_PRODUCT: {
          if (action.value) {
            change = {
              edits: {
                ...state.edits,
                product: {
                  ...initialTaskStates.product,
                  raw: action.value,
                },
                errors: Object.assign({}, state.edits.errors, action.errors),
              },
            };
            if (!action.value.startsWith('http')) {
              break;
            }
            const URL = parseURL(action.value);
            if (!URL || !URL.host) {
              break;
            }

            let newSite;
            const { sites } = action;

            sites.forEach(category => {
              const exists = category.options.find(s => URL.host.includes(s.value.split('/')[2]));
              if (exists) {
                newSite = exists;
              }
            });

            if (!newSite || newSite.label === state.site.name) {
              break;
            }
            change = {
              edits: {
                ...change.edits,
                site: {
                  url: newSite.value,
                  name: newSite.label,
                  apiKey: newSite.apiKey,
                  special: newSite.special || false,
                  auth: newSite.auth,
                },
                platform: siteToPlatform(newSite.value),
                errors: Object.assign({}, state.edits.errors, action.errors),
              },
            };
          } else {
            change = {
              edits: {
                ...state.edits,
                errors: Object.assign({}, state.edits.errors, action.errors),
                product: initialTaskStates.edit.product,
              },
            };
          }
          break;
        }
        case TASK_FIELDS.EDIT_SITE: {
          if (action.value) {
            if (state.edits.site && action.value.name === state.edits.site.name) {
              break;
            }
            change = {
              edits: {
                ...state.edits,
                platform: siteToPlatform(action.value.url),
                site: action.value,
                errors: Object.assign({}, state.edits.errors, action.errors),
              },
            };
          } else {
            change = {
              edits: {
                ...state.edits,
                site: initialTaskStates.edit.site,
                errors: Object.assign({}, state.edits.errors, action.errors),
              },
            };
          }
          break;
        }
        case TASK_FIELDS.EDIT_SIZES: {
          change = {
            edits: {
              ...state.edits,
              size: action.value,
              errors: Object.assign({}, state.edits.errors, action.errors),
            },
          };

          break;
        }
        case TASK_FIELDS.EDIT_PROFILE: {
          change = {
            edits: {
              ...state.edits,
              [mapTaskFieldsToKey[action.field]]:
                action.value || initialTaskStates.task.edits[mapTaskFieldsToKey[action.field]],
              errors: Object.assign({}, state.edits.errors, action.errors),
            },
          };
          break;
        }
        default:
          break;
      }
    }
  }
  return Object.assign({}, state, change);
}

export function newTaskReducer(state = initialTaskStates.task, action, defaults = {}) {
  switch (action.type) {
    case TASK_ACTIONS.EDIT: {
      // only modify the current task if the action id is null
      if (!action.id) {
        return taskReducer(state, action);
      }
      break;
    }
    case TASK_ACTIONS.ADD: {
      if (action.errors) {
        return Object.assign({}, state, {
          errors: Object.assign({}, state.errors, action.errors),
        });
      }
      // If we have a response error, we should do nothing
      if (!action.response || !action.response.task) {
        return Object.assign({}, state);
      }
      // If adding a valid new task, we shouldn't reset the current task to default values
      return Object.assign({}, state, {
        profile: defaults.useProfile ? defaults.profile : state.profile,
        size: defaults.useSizes ? defaults.size : state.size,
      });
    }
    case SETTINGS_ACTIONS.FETCH_SHIPPING: {
      if (
        action.errors ||
        (action.response && (!action.response.rates || !action.response.selectedRate)) ||
        (action.response && state.profile && action.response.id !== state.profile.id)
      ) {
        break;
      }

      // deconstruct response
      const { site } = action.response;
      let { rates, selectedRate } = action.response;
      const nextState = JSON.parse(JSON.stringify(state));

      // filter out data we don't need (for now)...
      rates = rates.map(r => ({ name: r.title, price: r.price, rate: r.id }));
      selectedRate = { name: selectedRate.title, price: selectedRate.price, rate: selectedRate.id };

      const ratesIdx = nextState.profile.rates.findIndex(r => r.site.url === site.url);
      if (ratesIdx < 0) {
        nextState.profile.rates.push({
          site: { name: site.name, url: site.url },
          rates,
          selectedRate,
        });
      } else {
        nextState.profile.rates[ratesIdx].selectedRate = selectedRate;
        // filter out duplicate rates from the previously stored rates
        const oldRates = nextState.profile.rates[ratesIdx].rates.filter(
          r1 => !rates.find(r2 => r2.name === r1.name),
        );
        nextState.profile.rates[ratesIdx].rates = oldRates.concat(rates);
      }
      return nextState;
    }
    case SETTINGS_ACTIONS.EDIT: {
      switch (action.field) {
        case SETTINGS_FIELDS.EDIT_DISCORD:
        case SETTINGS_FIELDS.EDIT_SLACK: {
          return {
            ...state,
            [mapSettingsFieldToKey[action.field]]: action.value,
          };
        }
        case SETTINGS_FIELDS.EDIT_ERROR_DELAY:
        case SETTINGS_FIELDS.EDIT_MONITOR_DELAY: {
          const strValue = action.value || '0';
          const intValue = parseInt(strValue, 10);
          if (Number.isNaN(intValue)) {
            // action.value isn't a valid integer, so we do nothing
            break;
          }
          return {
            ...state,
            [mapSettingsFieldToKey[action.field]]: intValue,
          };
        }
        default:
          break;
      }
      break;
    }
    case PROFILE_ACTIONS.REMOVE: {
      if (!action.id) {
        break;
      }

      if (state.profile && state.profile.id === action.id) {
        return {
          ...state,
          profile: initialTaskStates.task.profile,
        };
      }
      break;
    }
    case PROFILE_ACTIONS.UPDATE: {
      // If there's no profile, we should do nothing
      if (!action.profile || action.errors) {
        break;
      }

      if (state.profile && state.profile.id === action.profile.id) {
        return {
          ...state,
          profile: action.profile,
        };
      }
      break;
    }
    default:
      break;
  }

  return Object.assign({}, state);
}

export function selectedTaskReducer(state = initialTaskStates.task, action) {
  switch (action.type) {
    case TASK_ACTIONS.SELECT: {
      // if the user is toggling
      if (!action.task) {
        return Object.assign({}, initialTaskStates.task);
      }
      // Set the next state to the selected profile
      return Object.assign({}, action.task);
    }
    case TASK_ACTIONS.REMOVE: {
      if (action.response && action.response.type && action.response.type === 'all') {
        return Object.assign({}, initialTaskStates.task);
      }

      if (
        !action.response ||
        !action.response.task ||
        (action.response.task && !action.response.task.id) ||
        !state.id
      ) {
        break;
      }

      // TODO - account for removing tasks that aren't it now
      if (action.response.task.id === state.id) {
        return Object.assign({}, initialTaskStates.task);
      }
      break;
    }
    case SETTINGS_ACTIONS.FETCH_SHIPPING: {
      if (
        action.errors ||
        (action.response && (!action.response.rates || !action.response.selectedRate)) ||
        (action.response && state.profile && action.response.id !== state.profile.id)
      ) {
        break;
      }

      // deconstruct response
      const { site } = action.response;
      let { rates, selectedRate } = action.response;
      const nextState = JSON.parse(JSON.stringify(state));

      // filter out data we don't need (for now)...
      rates = rates.map(r => ({ name: r.title, price: r.price, rate: r.id }));
      selectedRate = { name: selectedRate.title, price: selectedRate.price, rate: selectedRate.id };

      const ratesIdx = nextState.profile.rates.findIndex(r => r.site.url === site.url);
      if (ratesIdx < 0) {
        nextState.profile.rates.push({
          site: { name: site.name, url: site.url },
          rates,
          selectedRate,
        });
      } else {
        nextState.profile.rates[ratesIdx].selectedRate = selectedRate;
        // filter out duplicate rates from the previously stored rates
        const oldRates = nextState.profile.rates[ratesIdx].rates.filter(
          r1 => !rates.find(r2 => r2.name === r1.name),
        );
        nextState.profile.rates[ratesIdx].rates = oldRates.concat(rates);
      }
      // update the edit profile context as well!
      nextState.edits.profile = nextState.profile;
      return nextState;
    }
    default:
      break;
  }

  return Object.assign({}, state);
}
