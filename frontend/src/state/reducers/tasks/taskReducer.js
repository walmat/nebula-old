import { initialProfileState } from '../profiles/profileReducer';

import {
  TASK_ACTIONS,
  TASK_FIELDS,
  mapTaskFieldsToKey,
  mapProductFieldsToKey,
} from '../../actions';

export const initialTaskState = {
  id: '',
  product: {
    raw: '',
    pos_keywords: null,
    neg_keywords: null,
    url: null,
    sku: null,
  },
  site: null,
  profile: initialProfileState,
  sizes: [],
  pairs: 1,
  status: 'idle',
  errors: {
    product: null,
    site: null,
    profile: null,
    sizes: null,
    pairs: null,
    status: null,
  },
};

export function taskReducer(state = initialTaskState, action) {
  let change = {};

  if (action.type === TASK_ACTIONS.EDIT) {
    switch (action.field) {
      case TASK_FIELDS.EDIT_PRODUCT:
        change = {
          product: {
            raw: action.value,
          },
        };
        break;
      default: {
        change = {
          [mapTaskFieldsToKey[action.field]]: action.value,
          errors: Object.assign({}, state.errors, action.errors),
        };
      }
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
