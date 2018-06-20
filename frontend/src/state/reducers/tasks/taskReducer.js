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
        };
        break;
      case TASK_FIELDS.EDIT_BILLING:
        change = {
          billing: action.value,
        };
        break;
      case TASK_FIELDS.EDIT_SIZES:
        change = {
          sizes: action.value,
        };
        break;
      case TASK_FIELDS.EDIT_PAIRS:
        change = {
          pairs: action.value,
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
                return profileReducer(state, action);
            }
            break;
        }
        case TASK_ACTIONS.ADD: {
            // If we have a response error, we should do nothing
            if(action.response !== undefined && action.response.error !== undefined) {
                return Object.assign({}, action.profile);
            }

            // If adding a new task, we should reset the current task to default values
            return Object.assign({}, initialProfileState);
        }
        case TASK_ACTIONS.UPDATE: {
            // If we have a response error, we should do nothing
            if(action.response !== undefined && action.response.error !== undefined) {
                return Object.assign({}, action.profile);
            }

            // If updating an existing profile, we should reset the current task to default values
            return Object.assign({}, initialProfileState);
        }
        case PROFILE_ACTIONS.LOAD: {
            // If selecting a profile, we should return the profile that is given
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

export function selectedTaskReducer(state = initialTaskState, action) {
    switch (action.type) {
      //todo add editing functionality
        case TASK_ACTIONS.SELECT: {
            return Object.assign({}, action.tasks);
        }
        default:
            break;
    }

    return Object.assign({}, state);
}
