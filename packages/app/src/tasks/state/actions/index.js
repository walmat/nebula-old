import makeActionCreator from '../../../store/creator';
import prefixer from '../../../store/reducers/prefixer';

import { States } from '../../../constants/tasks';

const prefix = '@@Task';
const tasksActions = ['EDIT_TASK'];
export const taskActionsList = ['@@Task/EDIT_TASK'];

const tasksListActions = [
  'CREATE_TASK',
  'UPDATE_TASK',
  'DUPLICATE_TASK',
  'UPDATE_MESSAGE',
  'SELECT_TASK',
  'SELECT_ALL_TASKS',
  'START_TASK',
  'START_ALL_TASKS',
  'STOP_TASK',
  'STOP_ALL_TASKS',
  'REMOVE_TASK',
  'REMOVE_ALL_TASKS',
];

export const taskListActionsList = [
  '@@Task/CREATE_TASK',
  '@@Task/UPDATE_TASK',
  '@@Task/DUPLICATE_TASK',
  '@@Task/UPDATE_MESSAGE',
  '@@Task/SELECT_TASK',
  '@@Task/SELECT_ALL_TASKS',
  '@@Task/START_TASK',
  '@@Task/START_ALL_TASKS',
  '@@Task/STOP_TASK',
  '@@Task/STOP_ALL_TASKS',
  '@@Task/REMOVE_TASK',
  '@@Task/REMOVE_ALL_TASKS',
];

export const TASK_ACTIONS = prefixer(prefix, tasksActions);
export const TASK_LIST_ACTIONS = prefixer(prefix, tasksListActions);

const _duplicateTaskRequest = async task => ({ task });

const _startTaskRequest = async (task, proxies = []) => {
  if (task.state === States.Running) {
    return null;
  }

  if (window.Bridge) {
    window.Bridge.addProxies(proxies);
    window.Bridge.startTasks(task, {});
  }

  return { task };
};

const _startAllTasksRequest = async (tasks, proxies = []) => {
  const newTasks = tasks.filter(t => t.state !== States.Running);

  if (window.Bridge) {
    window.Bridge.addProxies(proxies);
    window.Bridge.startTasks(newTasks, {});
  }

  return {
    tasks: newTasks.map(t => ({ ...t, state: States.Running, message: 'Starting task!' })),
  };
};

const _stopTaskRequest = async task => {
  if (task.state !== States.Running) {
    return null;
  }

  if (window.Bridge) {
    window.Bridge.stopTasks(task);
  }

  return { task };
};

const _stopAllTasksRequest = async tasks => {
  const runningTasks = tasks.filter(t => t.state === States.Running);

  if (!runningTasks || !runningTasks.length) {
    return null;
  }

  if (window.Bridge) {
    window.Bridge.stopTasks(runningTasks);
  }

  return { tasks: runningTasks.map(t => ({ ...t, state: States.Stopped, message: '' })) };
};

const _removeTaskRequest = async task => {
  if (!task) {
    return null;
  }
  if (window.Bridge) {
    window.Bridge.stopTasks(task);
  }

  return task.id;
};

const _removeAllTasksRequest = async tasks => {
  if (!tasks.length) {
    return null;
  }

  if (window.Bridge) {
    window.Bridge.stopTasks(tasks);
  }

  return { tasks };
};

// Private Actions
const _removeTask = makeActionCreator(TASK_LIST_ACTIONS.REMOVE_TASK, 'id');
const _removeAllTasks = makeActionCreator(TASK_LIST_ACTIONS.REMOVE_ALL_TASKS, 'response');
const _duplicateTask = makeActionCreator(TASK_LIST_ACTIONS.DUPLICATE_TASK, 'response');
const _startTask = makeActionCreator(TASK_LIST_ACTIONS.START_TASK, 'response');
const _startAllTasks = makeActionCreator(TASK_LIST_ACTIONS.START_ALL_TASKS, 'response');
const _stopTask = makeActionCreator(TASK_LIST_ACTIONS.STOP_TASK, 'response');
const _stopAllTasks = makeActionCreator(TASK_LIST_ACTIONS.STOP_ALL_TASKS, 'response');

// Public Actions
const createTask = makeActionCreator(TASK_LIST_ACTIONS.CREATE_TASK, 'response');
const editTask = makeActionCreator(TASK_ACTIONS.EDIT_TASK, 'id', 'field', 'value', 'sites');
const updateTask = makeActionCreator(TASK_ACTIONS.UPDATE_TASK, 'task', 'edits');
const selectTask = makeActionCreator(TASK_LIST_ACTIONS.SELECT_TASK, 'task');
const selectAllTasks = makeActionCreator(TASK_LIST_ACTIONS.SELECT_ALL_TASKS, 'tasks');
const messageTask = makeActionCreator(TASK_LIST_ACTIONS.UPDATE_MESSAGE, 'buffer');

// Public Thunks
const removeTask = task => dispatch =>
  _removeTaskRequest(task).then(id => dispatch(_removeTask(id)));

const removeAllTasks = tasks => dispatch =>
  _removeAllTasksRequest(tasks).then(response => dispatch(_removeAllTasks(response)));

const duplicateTask = task => dispatch =>
  _duplicateTaskRequest(task).then(response => dispatch(_duplicateTask(response)));

const startTask = (task, proxies) => dispatch =>
  _startTaskRequest(task, proxies).then(response => dispatch(_startTask(response)));

const startAllTasks = (tasks, proxies) => dispatch =>
  _startAllTasksRequest(tasks, proxies).then(response => dispatch(_startAllTasks(response)));

const stopTask = task => dispatch =>
  _stopTaskRequest(task).then(response => dispatch(_stopTask(response)));

const stopAllTasks = tasks => dispatch =>
  _stopAllTasksRequest(tasks).then(response => dispatch(_stopAllTasks(response)));

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
  update: updateTask,
  select: selectTask,
  selectAll: selectAllTasks,
  message: messageTask,
  duplicate: duplicateTask,
  start: startTask,
  startAll: startAllTasks,
  stop: stopTask,
  stopAll: stopAllTasks,
  remove: removeTask,
  removeAll: removeAllTasks,
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
