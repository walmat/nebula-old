import PLATFORMS from '../../../constants/platforms';
import { _getId } from '../../../constants/tasks';
import parseProductType from '../../../utils/parseProductType';
import { TASK_LIST_ACTIONS, GLOBAL_ACTIONS } from '../../../store/actions';
import { Tasks } from '../initial';

export default (state = Tasks, action) => {
  const { type } = action;

  if (type === GLOBAL_ACTIONS.RESET) {
    return Tasks;
  }

  if (type === TASK_LIST_ACTIONS.CREATE_TASK) {
    const { response } = action;

    if (!response) {
      return state;
    }

    const { task, amount } = response;

    if (!task || !amount) {
      return state;
    }

    const parsedProduct = parseProductType(task.product);

    if (!parsedProduct) {
      return state;
    }

    const newTask = task;
    newTask.product = parsedProduct;

    // trim some fat off the task object..
    switch (newTask.platform) {
      case PLATFORMS.Supreme: {
        delete newTask.type;
        delete newTask.account;
        break;
      }
      case PLATFORMS.Shopify: {
        delete newTask.product.variation;
        delete newTask.checkoutDelay;
        delete newTask.category;
        break;
      }
      default:
        break;
    }

    const newTasks = [...Array(amount)].map(() => {
      const { id } = _getId(state);
      return { ...newTask, id };
    });

    return [...state, ...newTasks];
  }

  if (type === TASK_LIST_ACTIONS.REMOVE_TASK) {
    const { id } = action;

    if (!id) {
      return state;
    }

    return state.filter(t => t.id !== id);
  }

  if (type === TASK_LIST_ACTIONS.REMOVE_ALL_TASKS) {
    return Tasks;
  }

  if (type === TASK_LIST_ACTIONS.UPDATE_TASK) {
    const { response } = action;

    if (!response) {
      return state;
    }

    const { task } = response;

    if (!task) {
      return state;
    }

    const parsedProduct = parseProductType(task.product);
    if (!parsedProduct) {
      return state;
    }

    task.product = parsedProduct;

    if (window.Bridge) {
      window.Bridge.restartTasks(task, { override: false });
    }

    return state.map(t => {
      if (t.id === task.id) {
        return task;
      }
      return t;
    });
  }

  if (type === TASK_LIST_ACTIONS.UPDATE_MESSAGE) {
    const { buffer } = action;

    if (!buffer) {
      return state;
    }

    const taskMap = {};
    state.forEach(t => {
      taskMap[t.id] = t;
    });

    Object.entries(buffer).forEach(([taskId, msg]) => {
      const { type: taskType, message } = msg;
      if (taskType !== 'srr') {
        const task = taskMap[taskId];

        if (task && task.message !== message) {
          task.message = message;
        }
      }
    });

    return state;
  }

  if (type === TASK_LIST_ACTIONS.DUPLICATE_TASK) {
    const { response } = action;

    if (!response) {
      return state;
    }

    const { task } = response;

    if (!task) {
      return state;
    }

    // get new task id
    const { id } = _getId(state);
    task.id = id;
    task.status = 'idle';
    return [...state, task];
  }

  if (type === TASK_LIST_ACTIONS.SELECT_TASK) {
    // TODO;
  }

  if (type === TASK_LIST_ACTIONS.SELECT_ALL_TASKS) {
    // TODO;
  }

  if (type === TASK_LIST_ACTIONS.START_TASK) {
    const { response } = action;
    if (!response) {
      return state;
    }

    const { task } = response;

    if (!task) {
      return state;
    }

    const { id } = task;

    return state.map(t => {
      if (t.id === id) {
        const newTask = t;
        newTask.status = 'running';
        newTask.message = 'Starting task!';
        return newTask;
      }
      return t;
    });
  }

  if (type === TASK_LIST_ACTIONS.STOP_TASK) {
    const { response } = action;
    if (!response) {
      return state;
    }

    const { task } = response;

    if (!task) {
      return state;
    }

    const { id } = task;

    return state.map(t => {
      if (t.id === id) {
        const newTask = t;
        newTask.status = 'stopped';
        newTask.message = '';
        return newTask;
      }
      return t;
    });
  }

  if (type === TASK_LIST_ACTIONS.START_ALL_TASKS || type === TASK_LIST_ACTIONS.STOP_ALL_TASKS) {
    const { response } = action;
    if (!response) {
      return state;
    }

    const { tasks } = response;

    if (!tasks || !tasks.length) {
      return state;
    }

    // return the found task, or return the existing task..
    return state.map(t => tasks.find(task => task.id === t.id) || t);
  }

  return state;
};
