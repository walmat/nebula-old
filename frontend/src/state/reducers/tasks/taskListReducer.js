import { TASK_ACTIONS } from '../../actions';
import { taskReducer } from './taskReducer';

export const initialTaskListState = [];
let _num = 1;

function _getId(taskList) {
  // if the tasksList is empty, reset the numbering
  if (taskList.length === 0) {
    _num = 1;
  }

  // assign new id
  let newId = _num;

  // check if generate id already exists
  const idCheck = t => t.id === newId;
  while (taskList.some(idCheck)) {
    _num += 1;
    newId = _num;
  }

  return newId;
}

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
      const newTask = JSON.parse(JSON.stringify(action.response.task));

      // copy over edits
      newTask.edits = {
        ...newTask.edits,
        profile: newTask.profile,
        sizes: newTask.sizes,
        pairs: newTask.pairs,
      };

      // add new task
      newTask.id = _getId(nextState);
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
        _num = nextState[i].id;
        nextState[i].id -= 1;
      }
      break;
    }
    case TASK_ACTIONS.UPDATE: {
      // If we have a response error, we should do nothing
      if (action.response !== undefined && action.response.error !== undefined) {
        console.log('ERROR with TASK UPDATE');
        console.log(action.response);
        break;
      }

      const updateId = action.response.id;
      const updateTask = JSON.parse(JSON.stringify(action.response.task));

      // Check for the task to update
      const foundTask = nextState.find(t => t.id === updateId);
      if (!foundTask) {
        break;
      }

      // find the index of the out of date task
      const idxToUpdate = nextState.indexOf(foundTask);

      // Check if current task has been setup properly
      if ((updateTask.edits.profile || updateTask.edits.pairs || updateTask.edits.sizes)) {
        // Set it up properly
        updateTask.profile = updateTask.edits.profile || updateTask.profile;
        updateTask.pairs = updateTask.edits.pairs || updateTask.pairs;
        updateTask.sizes = updateTask.edits.sizes || updateTask.sizes;
        // copy over to edits
        updateTask.edits = {
          ...updateTask.edits,
          profile: updateTask.profile,
          sizes: updateTask.sizes,
          pairs: updateTask.pairs,
        };
      }

      // Update the task
      nextState[idxToUpdate] = updateTask;
      break;
    }
    case TASK_ACTIONS.EDIT: {
      // check if id is given (we only change the state on a non-null id)
      if (action.id === null) {
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
