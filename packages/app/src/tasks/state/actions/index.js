import makeActionCreator from '../../../store/creator';

// Top level Actions
export const TASK_ACTIONS = {
  EDIT: 'EDIT_TASK',
  CREATE: 'CREATE_TASK',
  UPDATE_ALL: 'UPDATE_ALL_TASKS',
  SELECT: 'SELECT_TASK',
  SELECT_ALL: 'SELECT_ALL_TASKS',
  DUPLICATE: 'DUPLICATE_TASK',
  MESSAGE: 'UPDATE_MESSAGE',
  START: 'START_TASK',
  START_ALL: 'START_ALL_TASKS',
  STOP: 'STOP_TASK',
  STOP_ALL: 'STOP_ALL_TASKS',
  REMOVE: 'REMOVE_TASK',
  REMOVE_ALL: 'REMOVE_ALL_TASKS',
  ERROR: 'TASK_HANDLE_ERROR',
};

const _duplicateTaskRequest = async task => ({ task });

const _startTaskRequest = async (task, proxies = []) => {
  if (task.status === 'running') {
    throw new Error('Previously running!');
  }

  if (window.Bridge) {
    window.Bridge.addProxies(proxies);
    window.Bridge.startTasks(task, {});
  }

  return { task };
};

const _startAllTasksRequest = async (tasks, proxies = []) => {
  const newTasks = tasks.filter(t => t.status !== 'running');

  if (window.Bridge) {
    window.Bridge.addProxies(proxies);
    window.Bridge.startTasks(newTasks, {});
  }

  return { tasks: newTasks.map(t => ({ ...t, status: 'running', message: 'Starting task!' })) };
};

const _stopTaskRequest = async task => {
  if (task.status !== 'running') {
    throw new Error('Already stopped');
  }

  if (window.Bridge) {
    window.Bridge.stopTasks(task);
  }

  return { task };
};

const _stopAllTasksRequest = async tasks => {
  const runningTasks = tasks.filter(t => t.status === 'running');
  if (!runningTasks.length) {
    throw new Error('No tasks running');
  }

  if (window.Bridge) {
    window.Bridge.stopTasks(runningTasks);
  }

  return { tasks: runningTasks.map(t => ({ ...t, status: 'stopped', message: '' })) };
};

const _removeTaskRequest = async (task, type) => {
  if (!task) {
    throw new Error('No tasks given');
  }
  if (window.Bridge) {
    window.Bridge.stopTasks(task);
  }

  return { task, type };
};

const _removeAllTasksRequest = async tasks => {
  if (!tasks.length) {
    throw new Error('No tasks given');
  }

  if (window.Bridge) {
    window.Bridge.stopTasks(tasks);
  }

  return { tasks };
};

// Private Actions
const _removeTask = makeActionCreator(TASK_ACTIONS.REMOVE, 'response');
const _removeAllTasks = makeActionCreator(TASK_ACTIONS.REMOVE_ALL, 'response');
const _duplicateTask = makeActionCreator(TASK_ACTIONS.COPY, 'response');
const _startTask = makeActionCreator(TASK_ACTIONS.START, 'response');
const _startAllTasks = makeActionCreator(TASK_ACTIONS.START_ALL, 'response');
const _stopTask = makeActionCreator(TASK_ACTIONS.STOP, 'response');
const _stopAllTasks = makeActionCreator(TASK_ACTIONS.STOP_ALL, 'response');

// Public Actions
const createTask = makeActionCreator(TASK_ACTIONS.CREATE, 'response');
const editTask = makeActionCreator(TASK_ACTIONS.EDIT, 'id', 'field', 'value', 'sites');
const updateAllTasks = makeActionCreator(TASK_ACTIONS.UPDATE_ALL, 'tasks', 'edits');
const selectTask = makeActionCreator(TASK_ACTIONS.SELECT, 'task');
const selectAllTasks = makeActionCreator(TASK_ACTIONS.SELECT_ALL, 'tasks');
const messageTask = makeActionCreator(TASK_ACTIONS.STATUS, 'message');
const handleError = makeActionCreator(TASK_ACTIONS.ERROR, 'action', 'error');

// Public Thunks
const removeTask = (task, type) => dispatch =>
  _removeTaskRequest(task, type).then(
    response => dispatch(_removeTask(response)),
    error => dispatch(handleError(TASK_ACTIONS.REMOVE, error)),
  );

const removeAllTasks = tasks => dispatch =>
  _removeAllTasksRequest(tasks).then(
    response => dispatch(_removeAllTasks(response)),
    error => dispatch(handleError(TASK_ACTIONS.REMOVE_ALL, error)),
  );

const duplicateTask = task => dispatch =>
  _duplicateTaskRequest(task).then(
    response => dispatch(_duplicateTask(response)),
    error => dispatch(handleError(TASK_ACTIONS.DUPLICATE, error)),
  );

const startTask = (task, proxies) => dispatch =>
  _startTaskRequest(task, proxies).then(
    response => dispatch(_startTask(response)),
    error => dispatch(handleError(TASK_ACTIONS.START, error)),
  );

const startAllTasks = (tasks, proxies) => dispatch =>
  _startAllTasksRequest(tasks, proxies).then(
    response => dispatch(_startAllTasks(response)),
    error => dispatch(handleError(TASK_ACTIONS.START_ALL, error)),
  );

const stopTask = task => dispatch =>
  _stopTaskRequest(task).then(
    response => dispatch(_stopTask(response)),
    error => dispatch(handleError(TASK_ACTIONS.STOP, error)),
  );

const stopAllTasks = tasks => dispatch =>
  _stopAllTasksRequest(tasks).then(
    response => dispatch(_stopAllTasks(response)),
    error => dispatch(handleError(TASK_ACTIONS.STOP_ALL, error)),
  );

// Field Edits
export const TASK_FIELDS = {
  EDIT_PRODUCT: 'EDIT_PRODUCT',
  EDIT_TASK_ACCOUNT: 'EDIT_TASK_ACCOUNT',
  EDIT_TASK_CATEGORY: 'EDIT_TASK_CATEGORY',
  EDIT_PRODUCT_VARIATION: 'EDIT_PRODUCT_VARIATION',
  EDIT_CHECKOUT_DELAY: 'EDIT_CHECKOUT_DELAY',
  EDIT_SITE: 'EDIT_SITE',
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
  updateAll: updateAllTasks,
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
  error: handleError,
};

export const mapTaskFieldsToKey = {
  [TASK_FIELDS.EDIT_PRODUCT]: 'product',
  [TASK_FIELDS.EDIT_TASK_ACCOUNT]: 'account',
  [TASK_FIELDS.EDIT_TASK_CATEGORY]: 'category',
  [TASK_FIELDS.EDIT_PRODUCT_VARIATION]: 'variation',
  [TASK_FIELDS.EDIT_CHECKOUT_DELAY]: 'checkoutDelay',
  [TASK_FIELDS.EDIT_SITE]: 'site',
  [TASK_FIELDS.EDIT_PROFILE]: 'profile',
  [TASK_FIELDS.EDIT_SIZE]: 'size',
  [TASK_FIELDS.EDIT_AMOUNT]: 'amount',
  [TASK_FIELDS.EDIT_TASK_TYPE]: 'type',
  [TASK_FIELDS.TOGGLE_CAPTCHA]: 'captcha',
  [TASK_FIELDS.TOGGLE_RANDOM_IN_STOCK]: 'randomInStock',
};
