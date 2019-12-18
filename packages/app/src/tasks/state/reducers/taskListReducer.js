import moment from 'moment';
import { _getId, States, Platforms } from '../../../constants';
import parseProductType from '../../../utils/parseProductType';
import { TASK_LIST_ACTIONS, GLOBAL_ACTIONS } from '../../../store/actions';
import { Tasks } from '../initial';

export default (state = Tasks, action = {}) => {
  const { type } = action;

  if (type === GLOBAL_ACTIONS.RESET) {
    return Tasks;
  }

  if (type === TASK_LIST_ACTIONS.CREATE_TASK) {
    const { task } = action;

    if (!task) {
      return state;
    }

    const parsedProduct = parseProductType(task.product);

    if (!parsedProduct) {
      return state;
    }

    const newTask = { ...task };
    newTask.product = parsedProduct;

    // trim some fat off the task object..
    switch (newTask.platform) {
      case Platforms.Supreme: {
        delete newTask.type;
        delete newTask.account;
        break;
      }
      case Platforms.Shopify: {
        delete newTask.product.variation;
        delete newTask.checkoutDelay;
        delete newTask.category;
        break;
      }
      default:
        break;
    }


    if (newTask.schedule && moment(newTask.schedule).diff(moment(), 'seconds') > 0) {
      newTask.message = `Starting at ${moment(newTask.schedule).format('h:mm:ss A')}`;
    }

    const { amount } = task;
    delete newTask.amount;
    const newTasks = [...Array(amount)].map(() => {
      const { id } = _getId(state);
      return { ...newTask, id };
    });

    return [...state, ...newTasks];
  }

  if (type === TASK_LIST_ACTIONS.REMOVE_TASKS) {
    const { response } = action;
    if (!response) {
      return state;
    }

    const { tasks } = response;

    if (!tasks || !tasks.length) {
      return state;
    }

    return state.filter(t => !tasks.some(task => task.id === t.id));
  }

  if (type === TASK_LIST_ACTIONS.UPDATE_MESSAGE) {
    const { buffer } = action;

    if (!buffer) {
      return state;
    }

    return state.map(t => {
      if (t.state === States.Running) {
        return {
          ...t,
          ...buffer[t.id],
        };
      }
      return t;
    });
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

  if (type === TASK_LIST_ACTIONS.SELECT_TASK) {
    const { ctrl, task } = action;

    if (!task) {
      return state;
    }

    // todo.. perfect this a bit more
    if (ctrl) {
      const from = state.findIndex(t => t.lastSelected);
      if (from >= 0) {
        const to = state.findIndex(t => t.id === task.id);
        const needsSelected = state.some((tk, idx) => idx > from && idx <= to && !tk.selected);

        return state.map((t, i) => {
          if (i === to) {
            return {
              ...t,
              selected: needsSelected ? true : !t.selected,
              lastSelected: t.id,
            };
          }

          if (i > from && i < to) {
            return {
              ...t,
              selected: needsSelected ? true : !t.selected,
            };
          }
          return t;
        });
      }
    }

    return state.map(t => {
      if (t.id === task.id) {
        return {
          ...t,
          selected: !t.selected,
          lastSelected: t.id,
        };
      }
      return t;
    });
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
