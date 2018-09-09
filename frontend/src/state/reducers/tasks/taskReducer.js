import { initialProfileState } from '../profiles/profileReducer';

import {
  TASK_ACTIONS,
  TASK_FIELDS,
  mapTaskFieldsToKey,
} from '../../actions';

export const initialTaskState = {
  id: '',
  product: {
    raw: '',
    variant: null,
    pos_keywords: null,
    neg_keywords: null,
    url: null,
  },
  site: null,
  profile: initialProfileState,
  sizes: [],
  username: null,
  password: null,
  status: 'idle',
  error_delay: null,
  refresh_delay: null,
  errors: {
    method: null,
    product: {
      raw: null,
      variant: null,
      pos_keywords: null,
      neg_keywords: null,
      url: null,
    },
    site: null,
    profile: null,
    sizes: null,
    username: null,
    password: null,
    status: null,
    error_delay: null,
    refresh_delay: null,
  },
};

export function taskReducer(state = initialTaskState, action) {
  let change = {};
  if (action.type === TASK_ACTIONS.EDIT) {
    switch (action.field) {
      case TASK_FIELDS.EDIT_PRODUCT: {
        change = {
          product: {
            raw: action.value,
          },
        }
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
