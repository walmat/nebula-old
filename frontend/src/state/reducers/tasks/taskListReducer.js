import { TASK_ACTIONS } from '../../actions';
import { taskReducer } from './taskReducer';

export const initialTaskListState = [];
let num = 1;

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

      // if the tasksList is empty, reset the numbering
      if (nextState.length === 0) {
        num = 1;
      }

      // perform a deep copy of given profile
      const newTask = JSON.parse(JSON.stringify(action.response.task));

      // assign new id
      let newId = num;

      // check if generate id already exists
      const idCheck = t => t.id === newId;
      while (nextState.some(idCheck)) {
        num += 1;
        newId = num;
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

      // this we'll use to remove all tasks
      if (action.response.id === null) {
        nextState = [];
        break;
      }

      // filter out given id
      nextState = nextState.filter(t => t.id !== action.response.id);

      // adjust the id of each following task to shift down one when a task is deleted
      for (let i = action.response.id - 1; i < nextState.length; i += 1) {
        num = nextState[i].id;
        nextState[i].id -= 1;
      }
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
    case TASK_ACTIONS.START: {
      if (action.response.task.id === null) {
        break;
      }

      const found = nextState.find(t => t.id === action.response.task.id);
      if (found === undefined) {
        break;
      }
      const idx = nextState.indexOf(found);

      // do nothing if the task is already running..
      if (nextState[idx].status === 'running') {
        break;
      } else {
        nextState[idx].status = 'running';
      }
      break;
    }
    case TASK_ACTIONS.STOP: {
      if (action.response.task.id === null) {
        break;
      }

      const found = nextState.find(t => t.id === action.response.task.id);
      if (found === undefined) {
        break;
      }
      const idx = nextState.indexOf(found);

      // do nothing if the status is already stopped or idle
      if (nextState[idx].status === 'stopped' || nextState[idx].status === 'idle') {
        break;
      } else {
        nextState[idx].status = 'stopped';
      }
      break;
    }
    case TASK_ACTIONS.ERROR: {
      console.error(`Error trying to perform: ${action.action}! Reason: ${action.error}`);
      break;
    }
    default:
      break;
  }

  return nextState;
}
