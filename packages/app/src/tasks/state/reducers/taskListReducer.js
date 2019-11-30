import PLATFORMS from '../../../constants/platforms';
import { _getId } from '../../../constants/tasks';
import parseProductType from '../../../utils/parseProductType';
import { TASK_ACTIONS } from '../../../store/actions';
import { Tasks } from '../initial';

export default (state = Tasks, action) => {
  console.log('task list reducer handling action: ', action);

  const { type } = action;

  if (type === TASK_ACTIONS.CREATE) {
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

    // remove unnecessary fields from Tasks
    delete newTask.amount;
    delete newTask.errors;

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

    [...Array(amount)].forEach(() => {
      const { id } = _getId(state);
      return [...state, { ...newTask, id }];
    });
  }

  if (type === TASK_ACTIONS.REMOVE) {
    const { id } = action;

    if (!id) {
      return state;
    }

    return state.filter(t => t.id !== id);
  }

  if (type === TASK_ACTIONS.REMOVE_ALL) {
    return Tasks;
  }

  if (type === TASK_ACTIONS.UPDATE) {
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

  if (type === TASK_ACTIONS.MESSAGE) {
    const { message } = action;

    if (!message) {
      return state;
    }

    return state.map(t => {
      const task = t;
      task.message = message;
      return task;
    });
  }

  if (type === TASK_ACTIONS.DUPLICATE) {
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

  if (type === TASK_ACTIONS.SELECT) {
    // TODO;
  }

  if (type === TASK_ACTIONS.SELECT_ALL) {
    // TODO;
  }

  if (type === TASK_ACTIONS.START) {
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

  if (type === TASK_ACTIONS.STOP) {
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

  if (type === TASK_ACTIONS.START_ALL || type === TASK_ACTIONS.STOP_ALL) {
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
