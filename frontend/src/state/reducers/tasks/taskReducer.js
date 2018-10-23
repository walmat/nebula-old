import { parseURL } from 'whatwg-url';
import {
  TASK_ACTIONS,
  TASK_FIELDS,
  mapTaskFieldsToKey,
} from '../../actions';
import { initialTaskStates } from '../../../utils/definitions/taskDefinitions';
import getAllSites from '../../../constants/getAllSites';
import { initialTaskEditState } from '../../../utils/definitions/tasks/taskEdit';

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
          };
          if (!action.value || !action.value.startsWith('http')) {
            break;
          }
          const URL = parseURL(action.value);
          if (!URL || !URL.path) {
            break;
          }
          const site = getAllSites().filter(s => s.value.split('/')[2] === URL.host);
          if (site.length === 0) {
            break;
          }
          change = {
            ...change,
            site: {
              url: site[0].value,
              name: site[0].label,
            },
            username: null,
            password: null,
          };
          break;
        }
        case TASK_FIELDS.EDIT_SITE: {
          if (action.value) {
            change = {
              site: action.value,
              username: null,
              password: null,
            };
          } else {
            change = {
              site: initialTaskStates.site,
              username: initialTaskStates.task.username,
              password: initialTaskStates.task.password,
            };
          }
          break;
        }
        case TASK_FIELDS.EDIT_SIZES: {
          let nextSizes = JSON.parse(JSON.stringify(state.sizes));
          if (nextSizes === null) {
            nextSizes = initialTaskStates.task.sizes;
          } else if (action && action.value && action.value !== undefined && action.value.length > state.sizes.length) {
            nextSizes.unshift(...(action.value.filter(s => !state.sizes.includes(s))));
          } else {
            nextSizes = state.sizes.filter(s => action.value.includes(s));
          }

          change = {
            sizes: nextSizes,
            errors: Object.assign({}, state.errors, action.errors),
          };
          break;
        }
        default: {
          if (!mapTaskFieldsToKey[action.field]) {
            break;
          }
          change = {
            [mapTaskFieldsToKey[action.field]]: action.value ||
              initialTaskStates.task[mapTaskFieldsToKey[action.field]],
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
          change = {
            ...state.edits,
            edits: {
              errors: Object.assign({}, state.edits.errors, action.errors),
              product: {
                raw: action.value,
              },
            },
          };
          if (!action.value || !action.value.startsWith('http')) {
            break;
          }
          const URL = parseURL(action.value);
          if (!URL || !URL.path) {
            break;
          }
          const site = getAllSites().filter(s => s.value.split('/')[2] === URL.host);
          if (site.length === 0) {
            break;
          }
          change = {
            ...change,
            edits: {
              ...change.edits,
              site: {
                url: site[0].value,
                name: site[0].label,
              },
              username: null,
              password: null,
            },
          };
          break;
        }
        case TASK_FIELDS.EDIT_SITE: {
          if (action.value) {
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
              nextSizes = [{
                ...initialTaskStates.task.sizes,
                id: action.value[0].id,
                label: action.value[0].label,
                value: action.value[0].value,
              }];
            }
          } else if (action && action.value && action.value !== undefined && action.value.length > nextSizes.length) {
            nextSizes.unshift(...(action.value.filter(s => !state.edits.sizes.includes(s))));
          } else {
            nextSizes = state.edits.sizes.filter(s => action.value.includes(s));
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
        case TASK_FIELDS.EDIT_PAIRS:
        case TASK_FIELDS.EDIT_PROFILE:
        case TASK_FIELDS.EDIT_PASSWORD:
        case TASK_FIELDS.EDIT_USERNAME: {
          change = {
            edits: {
              ...state.edits,
              [mapTaskFieldsToKey[action.field]]: action.value ||
                initialTaskStates.task.edits[mapTaskFieldsToKey[action.field]],
              errors: Object.assign({}, state.edits.errors, action.errors),
            },
          };
          break;
        }
        default: break;
      }
    }
  }
  return Object.assign({}, state, change);
}

export function newTaskReducer(state = initialTaskStates.task, action) {
  switch (action.type) {
    case TASK_ACTIONS.EDIT: {
      // only modify the current task if the action id is null
      if (!action.id) {
        return taskReducer(state, action);
      }
      break;
    }
    case TASK_ACTIONS.ADD: {
      // If we have a response error, we should do nothing
      if (!action.response || (action.response && !action.response.task)) {
        return Object.assign({}, state);
      }
      // If adding a new task, we should reset the current task to default values
      return Object.assign({}, initialTaskStates.task);
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
    default:
      break;
  }

  return Object.assign({}, state);
}
