import { TASK_ACTIONS } from '../../actions';
import { taskReducer } from './taskReducer';
import { initialTaskStates } from '../../../utils/definitions/taskDefinitions';

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

export default function taskListReducer(
  state = initialTaskStates.list,
  action,
) {
  let nextState = JSON.parse(JSON.stringify(state));

  switch (action.type) {
    case TASK_ACTIONS.ADD: {
      // Check for valid payload structure
      if (
        action.errors ||
        !action.response ||
        (action.response && !action.response.task)
      ) {
        break;
      }

      // perform a deep copy of given task
      const newTask = JSON.parse(JSON.stringify(action.response.task));

      // copy over edits
      newTask.edits = {
        ...newTask.edits,
        profile: newTask.profile,
        product: newTask.product,
        sizes: newTask.sizes,
        site: newTask.site,
        username: newTask.username,
        password: newTask.password,
      };

      // add new task
      newTask.id = _getId(nextState);
      nextState.push(newTask);
      break;
    }
    case TASK_ACTIONS.REMOVE: {
      // Check for valid payload structure
      if (!action.response) {
        break;
      }

      const { task } = action.response;
      let taskId = -1;
      // Check if we are removing all tasks or just a single task
      if (task || task === null) {
        taskId = task && task.id;
      }

      // filter out task from list now
      nextState = nextState.filter(t => t.id !== (taskId || t.id));

      // Check if we have adjusted the array and need to recalculate ids
      if (nextState.length !== state.length && nextState.length !== 0) {
        // adjust the id of each following task to shift down one when a task is deleted
        for (let i = task.id - 1; i < nextState.length; i += 1) {
          _num = nextState[i].id;
          nextState[i].id -= 1;
        }
      }
      break;
    }
    case TASK_ACTIONS.UPDATE: {
      // Check if payload has correct structure or any errors
      if (
        action.errors ||
        !action.response ||
        !action.response.id ||
        !action.response.task
      ) {
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
      if (updateTask.edits) {
        // Set it up properly
        updateTask.profile = updateTask.edits.profile || updateTask.profile;
        updateTask.product = updateTask.edits.product || updateTask.product;
        updateTask.site = updateTask.edits.site || updateTask.site;
        updateTask.sizes = updateTask.edits.sizes || updateTask.sizes;
        updateTask.username = updateTask.edits.username || updateTask.username;
        updateTask.password = updateTask.edits.password || updateTask.password;
      }
      // copy over to edits
      updateTask.edits = {
        ...updateTask.edits,
        profile: updateTask.profile,
        product: updateTask.product,
        sizes: updateTask.sizes,
        site: updateTask.site,
        username: updateTask.username,
        password: updateTask.password,
        errors: {
          profile: null,
          product: null,
          sizes: null,
          site: null,
          username: null,
          password: null,
        },
      };

      // Update the task
      nextState[idxToUpdate] = updateTask;
      break;
    }
    case TASK_ACTIONS.STATUS: {
      if (!action.response.id || !action.response.message) {
        break;
      }
      const task = nextState.find(t => t.id === action.response.id);
      if (task) {
        task.output = action.response.message;
      }
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
      if (!action.response || (action.response && !action.response.task)) {
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
        nextState[idx].output = 'Starting task!';
      }
      break;
    }
    case TASK_ACTIONS.STOP: {
      if (!action.response || (action.response && !action.response.task)) {
        break;
      }

      const found = nextState.find(t => t.id === action.response.task.id);
      if (found === undefined) {
        break;
      }
      const idx = nextState.indexOf(found);

      // do nothing if the status is already stopped or idle
      if (
        nextState[idx].status === 'stopped' ||
        nextState[idx].status === 'idle'
      ) {
        break;
      } else {
        nextState[idx].status = 'stopped';
        nextState[idx].output = 'Stopping task...';
      }
      break;
    }
    case TASK_ACTIONS.ERROR: {
      console.error(
        `Error trying to perform: ${action.action}! Reason: ${action.error}`,
      );
      break;
    }
    default:
      break;
  }

  return nextState;
}
