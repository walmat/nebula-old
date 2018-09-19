import { initialProfileState } from '../profiles/profileReducer';

import {
  TASK_ACTIONS,
  TASK_FIELDS,
  mapTaskFieldsToKey,
} from '../../actions';
import { initialTaskStates } from '../../../utils/definitions/taskDefinitions';

export function taskReducer(state = initialTaskStates.task, action) {
  let change = {};
  if (action.type === TASK_ACTIONS.EDIT) {
    // Check if we are editing a new task or an existing one
    if (action.id === null) {
      switch (action.field) {
        case TASK_FIELDS.EDIT_PRODUCT: {
          change = {
            product: {
              raw: action.value,
            },
          };
          break;
        }
        case TASK_FIELDS.EDIT_SITE: {
          change = {
            site: action.value,
            username: null,
            password: null,
          };
          break;
        }
        default: {
          change = {
            [mapTaskFieldsToKey[action.field]]: action.value,
            errors: Object.assign({}, state.errors, action.errors),
          };
        }
      }
    } else {
      // If we are editing an existing task, only perform the change on valid edit fields
      switch (action.field) {
        case TASK_FIELDS.EDIT_PRODUCT: {
          change = {
            edits: {
              ...state.edits,
              product: {
                raw: action.value,
              },
            },
          };
          break;
        }
        case TASK_FIELDS.EDIT_SITE: {
          change = {
            edits: {
              ...state.edits,
              site: action.value,
              username: null,
              password: null,
            },
          };
          break;
        }
        case TASK_FIELDS.EDIT_PAIRS:
        case TASK_FIELDS.EDIT_PROFILE:
        case TASK_FIELDS.EDIT_SIZES:
        case TASK_FIELDS.EDIT_PASSWORD:
        case TASK_FIELDS.EDIT_USERNAME: {
          change = {
            edits: {
              ...state.edits,
              [mapTaskFieldsToKey[action.field]]: action.value,
              errors: Object.assign({}, state.errors, action.errors),
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
      if (action.id == null) {
        return taskReducer(state, action);
      }
      break;
    }
    case TASK_ACTIONS.ADD: {
      // If we have a response error, we should do nothing
      if (action.response !== undefined && action.response.error !== undefined) {
        return Object.assign({}, action.task);
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
      if (action.task === null) {
        return Object.assign({}, []);
      }
      // Set the next state to the selected profile
      return Object.assign({}, action.task);
    }
    default:
      break;
  }

  return Object.assign({}, state);
}
