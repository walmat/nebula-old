import PLATFORMS from '../../../constants/platforms';
import { _getId, States } from '../../../constants/tasks';
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

  if (type === TASK_LIST_ACTIONS.REMOVE_TASKS) {
    return Tasks;
  }

  if (type === TASK_LIST_ACTIONS.SELECT_TASK) {
    const { task } = action;

    if (!task) {
      return state;
    }

    task.selected = true;

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

    return state.map(t => ({
      ...t,
      message: buffer[t.id] || t.message,
    }));
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
    const newTask = {
      ...task,
      id,
      state: States.Stopped,
    };

    return [...state, newTask];
  }

  if (type === TASK_LIST_ACTIONS.SELECT_ALL_TASKS) {
    // if there is at least ONE task unselected, set all to be selected..
    if (state.some(t => !t.selected)) {
      return state.map(t => ({ ...t, selected: true }));
    }

    // otherwise, just toggle the previous state...
    return state.map(t => ({ ...t, selected: !t.selected }));
  }

  if (type === TASK_LIST_ACTIONS.START_TASKS || type === TASK_LIST_ACTIONS.STOP_TASKS) {
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
