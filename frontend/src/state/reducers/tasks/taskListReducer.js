import {
  TASK_FIELDS,
  TASK_ACTIONS,
} from '../../actions';
import { taskReducer } from './taskReducer';

export const initialTaskListState = [];

export function taskListReducer(state = initialTaskListState, action) {
  const change = {};

  let nextState = JSON.parse(JSON.stringify(state));

  if (action.type === TASK_FIELDS.EDIT && action.id !== null) {
    for (let i = 0; i < state.length; i += 1) {
      if (state[i].id === action.id) {
        taskReducer(); // todo fin this
      }
    }
  } else if (action.type === TASK_ACTIONS.ADD) {
    const newTask = Object.assign({}, action.task);
    newTask.id = state.length;
    return state.slice().push(newTask);
  } else if (action.type === TASK_ACTIONS.REMOVE) {
    return state.filter((task) => {
      return task !== action.id;
    });
  }
  change.errors = action.errors;

  return Object.assign({}, state, change);
}
