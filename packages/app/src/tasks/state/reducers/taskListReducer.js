import PLATFORMS from '../../../constants/platforms';
import { _getIndexAndId } from '../../../constants/tasks';
import parseProductType from '../../../utils/parseProductType';
import {
  TASK_ACTIONS,
  SETTINGS_ACTIONS,
  PROFILE_ACTIONS,
  SETTINGS_FIELDS,
  mapSettingsFieldToKey,
} from '../../../store/actions';
import { taskReducer } from './taskReducer';
import { Tasks } from '../initial';

export default function taskListReducer(state = Tasks, action) {
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
      const { index, id } = _getIndexAndId(state);
      return [...state, { ...newTask, id, index }];
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

    const { id, task } = response;

    if (!id || !task) {
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

  if (type === TASK_ACTIONS.UPDATE_ALL) {
    // TODO;
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

  switch (action.type) {
    // patch to check for settings updates
    case SETTINGS_ACTIONS.FETCH_SHIPPING: {
      if (
        action.errors ||
        (action.response && (!action.response.rates || !action.response.selectedRate))
      ) {
        break;
      }

      // deconstruct response
      const { id, site } = action.response;
      const { rates, selectedRate } = action.response;

      nextState.forEach(task => {
        const { id: profileId, rates: profileRates } = task.profile;
        if (profileId === id) {
          // filter out data we don't need (for now)...
          const newRates = rates.map(r => ({ name: r.title, price: r.price, rate: r.id }));
          const selected = {
            name: selectedRate.title,
            price: selectedRate.price,
            rate: selectedRate.id,
          };

          const ratesIdx = profileRates.findIndex(r => r.site.url === site.url);
          if (ratesIdx < 0) {
            profileRates.push({
              site: { name: site.name, url: site.url },
              rates: newRates,
              selectedRate: selected,
            });
          } else {
            profileRates[ratesIdx].selectedRate = selected;
            // filter out duplicate rates from the previously stored rates
            const oldRates = profileRates[ratesIdx].rates.filter(
              r1 => !newRates.find(r2 => r2.name === r1.name),
            );
            profileRates[ratesIdx].rates = oldRates.concat(newRates);
          }
        }
      });
      break;
    }
    case SETTINGS_ACTIONS.EDIT: {
      switch (action.field) {
        case SETTINGS_FIELDS.EDIT_ERROR_DELAY:
        case SETTINGS_FIELDS.EDIT_MONITOR_DELAY:
          const strValue = action.value || '0';
          const intValue = parseInt(strValue, 10);
          if (Number.isNaN(intValue)) {
            break;
          }
          nextState = nextState.map(task => ({
            ...task,
            [mapSettingsFieldToKey[action.field]]: intValue,
          }));
          break;
        case SETTINGS_FIELDS.EDIT_DISCORD:
        case SETTINGS_FIELDS.EDIT_SLACK:
          nextState = nextState.map(task => ({
            ...task,
            [mapSettingsFieldToKey[action.field]]: action.value,
          }));
          break;
        default:
          break;
      }
      break;
    }
    // patch to check for profile updates
    case PROFILE_ACTIONS.ADD:
    case PROFILE_ACTIONS.UPDATE: {
      // If there's no profile, we should do nothing
      if (!action.profile || action.errors) {
        break;
      }
      nextState = nextState.map(task => ({
        ...task,
        profile: action.profile.id === task.profile.id ? action.profile : task.profile,
      }));
      break;
    }
    // patch to remove tasks containing removed profile
    case PROFILE_ACTIONS.REMOVE: {
      const tasks = nextState.filter(t => t.profile.id === action.id);
      if (tasks.length) {
        tasks.forEach(task => {
          nextState = nextState.filter(t => t.id !== task.id);
        });
      }
      break;
    }
    case TASK_ACTIONS.STATUS: {
      if (!action.messageBuffer) {
        break;
      }
      const { messageBuffer } = action;
      const taskMap = {};
      // eslint-disable-next-line array-callback-return
      nextState.map(t => {
        taskMap[t.id] = t;
      });
      // for each task in the messageBuffer, update the status
      Promise.all(
        // eslint-disable-next-line array-callback-return
        Object.entries(messageBuffer).map(([taskId, msg]) => {
          const { type } = msg;
          if (type !== 'srr') {
            const task = taskMap[taskId];
            if (task) {
              // const { message, size, rawProxy, found, apiKey, checkoutUrl, order, status } = msg;
              const { message } = msg;
              task.message = message;
              // if (size) {
              //   task.chosenSize = size;
              // }
              // if (rawProxy) {
              //   task.proxy = rawProxy;
              // }
              // if (found) {
              //   task.product.found = found;
              // }
              // if (apiKey) {
              //   task.site.apiKey = apiKey;
              // }
              // if (checkoutUrl) {
              //   task.checkoutUrl = checkoutUrl;
              // }
              // if (order) {
              //   task.order = order;
              // }
              // if (status) {
              //   task.status = status;
              // }
            }
          }
        }),
      );
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
    case TASK_ACTIONS.COPY: {
      if (!action.response || (action.response && !action.response.task)) {
        break;
      }
      const newTask = JSON.parse(JSON.stringify(action.response.task));

      // get new task id
      const { index, id } = _getIndexAndId(nextState);
      newTask.id = id;
      newTask.index = index;
      // reset new task status
      newTask.status = 'idle';
      nextState.push(newTask);
      break;
    }
    case TASK_ACTIONS.START: {
      if (!action.response || (action.response && !action.response.task)) {
        break;
      }

      const idx = nextState.findIndex(t => t.id === action.response.task.id);
      if (idx < 0) {
        break;
      }

      // do nothing if the task is already running..
      if (nextState[idx].status === 'running') {
        break;
      } else {
        nextState[idx].status = 'running';
        nextState[idx].output = 'Starting task!';
      }
      break;
    }
    case TASK_ACTIONS.START_ALL: {
      if (!action.response || (action.response && !action.response.tasks)) {
        break;
      }

      const { tasks } = action.response;

      Promise.all(
        tasks.map(task => {
          const idx = nextState.findIndex(t => t.id === task.id);
          if (idx === -1 || nextState[idx].status === 'running') {
            return;
          }

          nextState[idx].status = 'running';
          nextState[idx].message = 'Starting task!';
        }),
      );
      break;
    }
    case TASK_ACTIONS.STOP: {
      if (!action.response || (action.response && !action.response.task)) {
        break;
      }

      const idx = nextState.findIndex(t => t.id === action.response.task.id);
      if (idx < 0) {
        break;
      }

      // do nothing if the status is already stopped or idle
      if (nextState[idx].status === 'stopped' || nextState[idx].status === 'idle') {
        break;
      } else {
        nextState[idx].status = 'stopped';
        nextState[idx].message = '';
        nextState[idx].chosenSize = nextState[idx].size;
        nextState[idx].proxy = null;
        nextState[idx].product.found = null;
      }
      break;
    }

    case TASK_ACTIONS.STOP_ALL: {
      if (!action.response || (action.response && !action.response.tasks)) {
        break;
      }

      const { tasks } = action.response;

      Promise.all(
        // eslint-disable-next-line array-callback-return
        tasks.map(task => {
          const idx = nextState.findIndex(t => t.id === task.id);

          if (idx === -1) {
            return;
          }

          nextState[idx].status = 'stopped';
          nextState[idx].message = '';
          nextState[idx].chosenSize = nextState[idx].size;
          nextState[idx].proxy = null;
          nextState[idx].product.found = null;
        }),
      );
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
