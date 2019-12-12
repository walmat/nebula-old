import makeActionCreator from '../../../store/creator';
import prefixer from '../../../store/reducers/prefixer';

const States = {
  Running: 'RUNNING',
  Stopped: 'STOPPED',
};

const prefix = '@@Task';
const tasksActions = ['EDIT_TASK'];
export const taskActionsList = ['@@Task/EDIT_TASK'];

const tasksListActions = [
  'CREATE_TASK',
  'DUPLICATE_TASK',
  'UPDATE_MESSAGE',
  'SELECT_TASK',
  'SELECT_ALL_TASKS',
  'START_TASKS',
  'STOP_TASKS',
  'REMOVE_TASKS',
];

export const taskListActionsList = [
  '@@Task/CREATE_TASK',
  '@@Task/DUPLICATE_TASK',
  '@@Task/UPDATE_MESSAGE',
  '@@Task/SELECT_TASK',
  '@@Task/SELECT_ALL_TASKS',
  '@@Task/START_TASKS',
  '@@Task/STOP_TASKS',
  '@@Task/REMOVE_TASKS',
];

export const TASK_ACTIONS = prefixer(prefix, tasksActions);
export const TASK_LIST_ACTIONS = prefixer(prefix, tasksListActions);

const _startTasksRequest = async (tasks, delays, proxies = []) => {
  const newTasks = tasks.filter(t => t.state !== States.Running);

  const toStart = newTasks.map(t => ({
    ...t,
    delays,
    state: States.Running,
    message: 'Starting task!',
  }));

  if (window.Bridge) {
    window.Bridge.addProxies(proxies);
    window.Bridge.startTasks(toStart, {});
  }

  return { tasks: toStart };
};

const _stopTasksRequest = async tasks => {
  const runningTasks = tasks.filter(t => t.state === States.Running);

  if (!runningTasks || !runningTasks.length) {
    return null;
  }

  if (window.Bridge) {
    window.Bridge.stopTasks(runningTasks);
  }

  return { tasks: runningTasks.map(t => ({ ...t, state: States.Stopped, message: '' })) };
};

const _removeTasksRequest = async tasks => {
  if (!tasks.length) {
    return null;
  }

  if (window.Bridge) {
    window.Bridge.stopTasks(tasks);
  }

  return { tasks };
};

// Private Actions
const _startTasks = makeActionCreator(TASK_LIST_ACTIONS.START_TASKS, 'response');
const _stopTasks = makeActionCreator(TASK_LIST_ACTIONS.STOP_TASKS, 'response');
const _removeTask = makeActionCreator(TASK_LIST_ACTIONS.REMOVE_TASKS, 'response');

// Public Actions
const createTask = makeActionCreator(TASK_LIST_ACTIONS.CREATE_TASK, 'task');
const duplicateTask = makeActionCreator(TASK_LIST_ACTIONS.DUPLICATE_TASK, 'response');
const editTask = makeActionCreator(TASK_ACTIONS.EDIT_TASK, 'id', 'field', 'value', 'sites');
const selectTask = makeActionCreator(TASK_LIST_ACTIONS.SELECT_TASK, 'ctrl', 'task');
const selectAllTasks = makeActionCreator(TASK_LIST_ACTIONS.SELECT_ALL_TASKS, 'tasks');
const messageTask = makeActionCreator(TASK_LIST_ACTIONS.UPDATE_MESSAGE, 'buffer');

// Public Thunks
const removeTasks = task => dispatch =>
  _removeTasksRequest(task).then(response => dispatch(_removeTask(response)));

const startTasks = (tasks, delays, proxies) => dispatch =>
  _startTasksRequest(tasks, delays, proxies).then(response => dispatch(_startTasks(response)));

const stopTasks = tasks => dispatch =>
  _stopTasksRequest(tasks).then(response => dispatch(_stopTasks(response)));

// Field Edits
export const TASK_FIELDS = {
  EDIT_PRODUCT: 'EDIT_PRODUCT',
  EDIT_TASK_ACCOUNT: 'EDIT_TASK_ACCOUNT',
  EDIT_TASK_CATEGORY: 'EDIT_TASK_CATEGORY',
  EDIT_PRODUCT_VARIATION: 'EDIT_PRODUCT_VARIATION',
  EDIT_CHECKOUT_DELAY: 'EDIT_CHECKOUT_DELAY',
  EDIT_STORE: 'EDIT_STORE',
  EDIT_PROFILE: 'EDIT_PROFILE',
  EDIT_SIZE: 'EDIT_SIZE',
  EDIT_AMOUNT: 'EDIT_AMOUNT',
  TOGGLE_CAPTCHA: 'TOGGLE_CAPTCHA',
  TOGGLE_RANDOM_IN_STOCK: 'TOGGLE_RANDOM_IN_STOCK',
  TOGGLE_ONE_CHECKOUT: 'TOGGLE_ONE_CHECKOUT',
  TOGGLE_RESTOCK_MODE: 'TOGGLE_RESTOCK_MODE',
  EDIT_TASK_TYPE: 'EDIT_TASK_TYPE',
};

export const taskActions = {
  edit: editTask,
  create: createTask,
  select: selectTask,
  selectAll: selectAllTasks,
  message: messageTask,
  duplicate: duplicateTask,
  start: startTasks,
  stop: stopTasks,
  remove: removeTasks,
};

export const mapTaskFieldsToKey = {
  [TASK_FIELDS.EDIT_PRODUCT]: 'product',
  [TASK_FIELDS.EDIT_TASK_ACCOUNT]: 'account',
  [TASK_FIELDS.EDIT_TASK_CATEGORY]: 'category',
  [TASK_FIELDS.EDIT_PRODUCT_VARIATION]: 'variation',
  [TASK_FIELDS.EDIT_CHECKOUT_DELAY]: 'checkoutDelay',
  [TASK_FIELDS.EDIT_STORE]: 'store',
  [TASK_FIELDS.EDIT_PROFILE]: 'profile',
  [TASK_FIELDS.EDIT_SIZE]: 'size',
  [TASK_FIELDS.EDIT_AMOUNT]: 'amount',
  [TASK_FIELDS.EDIT_TASK_TYPE]: 'type',
  [TASK_FIELDS.TOGGLE_CAPTCHA]: 'captcha',
  [TASK_FIELDS.TOGGLE_RANDOM_IN_STOCK]: 'randomInStock',
};
