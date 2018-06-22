import { TASK_ACTIONS } from '../../actions';
import { taskReducer } from './taskReducer';

export const initialTaskListState = [];
export var num = 1;

export function taskListReducer(state = initialTaskListState, action) {
  let nextState = JSON.parse(JSON.stringify(state));

  switch (action.type) {
    case TASK_ACTIONS.ADD: {
      // If we have a response error, we should do nothing
      if (action.response !== undefined && action.response.error !== undefined) {
        console.log('ERROR with TASK ADD');
        console.log(action.response);
        break;
      }
      // perform a deep copy of given profile
      const newTask = JSON.parse(JSON.stringify(action.task));

      // assign new id
      let newId = num;

      // check if generate id already exists
      const idCheck = t => t.id === newId;
      while (nextState.some(idCheck)) {
        newId = num++;
      }

      // add new task
      newTask.id = newId;
      nextState.push(newTask);
      break;
    }
    case TASK_ACTIONS.REMOVE: {
      // If we have a response error, we should do nothing
      if (action.response !== undefined && action.response.error !== undefined) {
        console.log('ERROR with TASK REMOVE');
        console.log(action.response);
        break;
      }

      // filter out given id
      nextState = nextState.filter(t => t.id !== action.id);
      break;
    }
    case TASK_ACTIONS.EDIT: {
      // check if id is given (we only change the state on a non-null id)
      if (action.id == null) {
        break;
      }

      // find the element with the given id
      const found = nextState.find(t => t.id === action.id);
      if (found === undefined) {
        break;
      }

      // find the index of the old object
      const idx = nextState.indexOf(found);

      // Reduce the found task using our task reducer
      nextState[idx] = taskReducer(found, action);
      break;
    }
    default:
      break;
  }

  return nextState;
}
