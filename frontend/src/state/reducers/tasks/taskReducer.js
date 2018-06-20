import {
    PROFILE_ACTIONS,
    TASK_ACTIONS,
    TASK_FIELDS,
} from '../../actions';
import {initialProfileState, profileReducer} from "../profiles/profileReducer";

export const initialTaskState = {
  id: null,
  sku: '',
  profiles: {},
  sizes: {},
  pairs: 0,
  errors: {
    sku: null,
    billing: null,
    sizes: null,
    pairs: null,
  },
};

export function taskReducer(state = initialTaskState, action) {
  let change = {};

  if (action.type === TASK_ACTIONS.EDIT) {
    switch (action.field) {
      case TASK_FIELDS.EDIT_SKU:
        change = {
          sku: action.value,
          errors: Object.assign({}, state.errors, action.errors)
        };
        break;
      case TASK_FIELDS.EDIT_BILLING:
        change = {
          billing: action.value,
          errors: Object.assign({}, state.errors, action.errors)
        };
        break;
      case TASK_FIELDS.EDIT_SIZES:
        change = {
          sizes: action.value,
          errors: Object.assign({}, state.errors, action.errors)
        };
        break;
      case TASK_FIELDS.EDIT_PAIRS:
        change = {
          pairs: action.value,
          errors: Object.assign({}, state.errors, action.errors)
        };
        break;
      default:
        change = {};
    }
  }
  change.errors = action.errors;

  return Object.assign({}, state, change);
}

export function currentTaskReducer(state = initialTaskState, action) {
    switch (action.type) {
        case TASK_ACTIONS.EDIT: {
            // only modify the current task if the action id is null
            if (action.id == null) {
                return taskReducer(state, action);
            }
            break;
        }
        case TASK_ACTIONS.ADD: {
            // If we have a response error, we should do nothing
            if(action.response !== undefined && action.response.error !== undefined) {
                return Object.assign({}, action.tasks);
            }

            // If adding a new task, we should reset the current task to default values
            return Object.assign({}, initialTaskState);
        }
        case TASK_ACTIONS.UPDATE: {
            // If we have a response error, we should do nothing
            if(action.response !== undefined && action.response.error !== undefined) {
                return Object.assign({}, action.tasks);
            }

            // If updating an existing task, we should reset the current task to default values
            return Object.assign({}, initialTaskState);
        }
        case PROFILE_ACTIONS.LOAD: {
            // If selecting a task, we should return the task that is given
            const loadedTask = Object.assign({}, action.tasks);
            loadedTask.editId = loadedTask.id;
            loadedTask.id = null;

            return loadedTask;
        }
        default:
            break;
    }

    return Object.assign({}, state);
}