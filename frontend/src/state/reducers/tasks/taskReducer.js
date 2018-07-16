import {
  TASK_ACTIONS,
  TASK_FIELDS,
} from '../../actions';

export const initialTaskState = {
  id: '',
  sku: '',
  profile: {},
  sizes: '',
  pairs: '',
  errors: {
    sku: null,
    profile: null,
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
          errors: Object.assign({}, state.errors, action.errors),
        };
        break;
      case TASK_FIELDS.EDIT_PROFILE:
        change = {
          profile: action.value,
          errors: Object.assign({}, state.errors, action.errors),
        };
        break;
      case TASK_FIELDS.EDIT_SIZES:
        change = {
          sizes: action.value,
          errors: Object.assign({}, state.errors, action.errors),
        };
        break;
      case TASK_FIELDS.EDIT_PAIRS:
        change = {
          pairs: action.value,
          errors: Object.assign({}, state.errors, action.errors),
        };
        break;
      default:
        change = {};
    }
  }

  return Object.assign({}, state, change);
}

export function newTaskReducer(state = initialTaskState, action) {
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
      return Object.assign({}, initialTaskState);
    }
    default:
      break;
  }

  return Object.assign({}, state);
}

export function selectedTaskReducer(state = initialTaskState, action) {
  switch (action.type) {
    case TASK_ACTIONS.SELECT: {
      // Set the next state to the selected profile
      return Object.assign({}, action.task);
    }
    default:
      break;
  }

  return Object.assign({}, state);
}
