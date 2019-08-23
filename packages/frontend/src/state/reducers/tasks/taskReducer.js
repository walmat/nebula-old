import { parseURL } from 'whatwg-url';
import { PROFILE_ACTIONS, TASK_ACTIONS, TASK_FIELDS, mapTaskFieldsToKey } from '../../actions';
import initialTaskStates from '../../initial/tasks';
import getAllSites from '../../../constants/getAllSites';
import TASK_TYPES from '../../../constants/taskTypes';
import {
  SETTINGS_ACTIONS,
  SETTINGS_FIELDS,
  mapSettingsFieldToKey,
} from '../../actions/settings/settingsActions';

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
              ...initialTaskStates.product,
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
          const newSite = getAllSites().find(s => URL.host.includes(s.value.split('/')[2]));
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
            username: null,
            password: null,
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
              site: action.value,
              username: null,
              password: null,
              errors: Object.assign({}, state.errors, action.errors),
            };
          } else {
            change = {
              site: initialTaskStates.site,
              username: initialTaskStates.task.username,
              password: initialTaskStates.task.password,
              errors: Object.assign({}, state.errors, action.errors),
            };
          }
          break;
        }
        case TASK_FIELDS.EDIT_SIZES: {
          let nextSizes = JSON.parse(JSON.stringify(state.sizes));
          if (nextSizes === null) {
            nextSizes = initialTaskStates.task.sizes;
          } else if (action.value && action.value.length > state.sizes.length) {
            nextSizes.unshift(...action.value.filter(s => !state.sizes.find(v => s === v)));
          } else {
            nextSizes = state.sizes.filter(s => action.value.find(v => s === v));
          }
          change = {
            sizes: nextSizes,
            chosenSizes: nextSizes,
            errors: Object.assign({}, state.errors, action.errors),
          };
          break;
        }
        case TASK_FIELDS.EDIT_TASK_TYPE: {
          switch (state.type) {
            case 'SAFE': {
              change = {
                type: TASK_TYPES.FAST,
              };
              break;
            }
            case 'FAST': {
              change = {
                type: TASK_TYPES.SAFE,
              };
              break;
            }
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
          console.log('toggling captcha');
          change = {
            forceCaptcha: !state.forceCaptcha,
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
            const newSite = getAllSites().find(s => URL.host.includes(s.value.split('/')[2]));
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
                username: null,
                password: null,
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
                errors: Object.assign({}, state.edits.errors, action.errors),
                site: action.value,
                username: null,
                password: null,
              },
            };
          } else {
            change = {
              edits: {
                ...state.edits,
                errors: Object.assign({}, state.edits.errors, action.errors),
                site: initialTaskStates.edit.site,
                username: initialTaskStates.edit.site,
                password: initialTaskStates.edit.site,
              },
            };
          }
          break;
        }
        case TASK_FIELDS.EDIT_SIZES: {
          let nextSizes = JSON.parse(JSON.stringify(state.edits.sizes));
          if (nextSizes === null) {
            if (action.value) {
              nextSizes = action.value;
            }
          } else if (action.value && action.value.length > nextSizes.length) {
            nextSizes.unshift(...action.value.filter(s => !state.edits.sizes.find(v => s === v)));
          } else {
            nextSizes = state.edits.sizes.filter(s => action.value.find(v => s === v));
          }

          change = {
            edits: {
              ...state.edits,
              sizes: nextSizes,
              errors: Object.assign({}, state.edits.errors, action.errors),
            },
          };
          break;
        }
        case TASK_FIELDS.EDIT_PROFILE:
        case TASK_FIELDS.EDIT_PASSWORD:
        case TASK_FIELDS.EDIT_USERNAME: {
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
        sizes: defaults.useSizes ? defaults.sizes : state.sizes,
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
