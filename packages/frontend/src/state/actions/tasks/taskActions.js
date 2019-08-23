// import _ from 'lodash';
import makeActionCreator from '../actionCreator';
import parseProductType from '../../../utils/parseProductType';

// Top level Actions
export const TASK_ACTIONS = {
  ADD: 'ADD_TASK',
  REMOVE: 'REMOVE_TASK',
  REMOVE_ALL: 'REMOVE_ALL_TASKS',
  EDIT: 'EDIT_TASK',
  SELECT: 'SELECT_TASK',
  UPDATE: 'UPDATE_TASK',
  COPY: 'COPY_TASK',
  STATUS: 'UPDATE_STATUS',
  START: 'START_TASK',
  START_ALL: 'START_ALL_TASKS',
  STOP: 'STOP_TASK',
  STOP_ALL: 'STOP_ALL_TASKS',
  ERROR: 'TASK_HANDLE_ERROR',
};

// Private API Requests
const _addTaskRequest = async (task, amount) => {
  const copy = JSON.parse(JSON.stringify(task));
  const parsedProduct = parseProductType(copy.product);

  if (parsedProduct) {
    copy.product = parsedProduct;
    return { task: copy, amount };
  }
  throw new Error('Invalid Task');
};

const _updateTaskRequest = async (id, task) => {
  // TODO: Replace this with an actual API call
  // API will likely do something like this:
  const copy = JSON.parse(JSON.stringify(task));

  if (copy.edits !== null) {
    copy.profile = copy.edits.profile || copy.profile;
    copy.product = copy.edits.product || copy.product;
    copy.sizes = copy.edits.sizes || copy.sizes;
    copy.site = copy.edits.site || copy.site;
    if (copy.site.auth) {
      // if we need auth, choose the correct user/pass combo
      copy.username = copy.edits.site ? copy.edits.username : copy.username;
      copy.password = copy.edits.site ? copy.edits.password : copy.password;
    } else {
      // Clear out the user/pass component since we don't need auth
      copy.username = '';
      copy.password = '';
    }
  }

  // After updating the base, reparse the products to make sure the correct type is filled out
  const parsedProduct = parseProductType({
    ...copy.product,
    variant: null,
    url: null,
    pos_keywords: null,
    neg_keywords: null,
  });

  if (!parsedProduct) {
    throw new Error('Unknown Product!');
  }
  copy.product = parsedProduct;

  // Update the edits map
  copy.edits = {
    profile: copy.profile,
    product: copy.product,
    sizes: copy.sizes,
    site: copy.site,
    username: copy.username,
    password: copy.password,
    errors: {
      profile: null,
      product: null,
      sizes: null,
      site: null,
      username: null,
      password: null,
    },
  };
  return { id, task: copy };
};

const _destroyTaskRequest = async (task, type) => {
  if (!task) {
    throw new Error('no task given');
  }
  if (window.Bridge) {
    window.Bridge.stopTasks(task);
  }
  return {
    task,
    type,
  };
};

const _destroyAllTasksRequest = async tasks => {
  if (!tasks.length) {
    throw new Error('No tasks given');
  }

  if (window.Bridge) {
    window.Bridge.stopTasks(tasks);
  }

  return { tasks };
};

const _startTaskRequest = async (task, proxies = []) => {
  if (task.status === 'running') {
    const error = new Error('Already running');
    error.status = 401;
    throw error;
  } else {
    if (window.Bridge && !task.needsChanged) {
      window.Bridge.addProxies(proxies);
      window.Bridge.startTasks(task, {});
    }
    return { task };
  }
};

const _startAllTasksRequest = async (tasks, proxies = []) => {
  const newTasks = tasks.filter(t => t.status !== 'running' && !t.needsChanged);

  if (window.Bridge) {
    window.Bridge.addProxies(proxies);
    window.Bridge.startTasks(newTasks, {});
  }

  return { tasks };
};

const _copyTaskRequest = async task => {
  if (!task) {
    throw new Error('Invalid task structure!');
  }
  return { task };
};

const _stopTaskRequest = async task => {
  if (task.status !== 'running') {
    throw new Error('Already stopped');
  } else {
    if (window.Bridge) {
      window.Bridge.stopTasks(task);
    }
    return { task };
  }
};

const _stopAllTasksRequest = async tasks => {
  if (!tasks.length) {
    throw new Error('No tasks running');
  }

  if (window.Bridge) {
    window.Bridge.stopTasks(tasks);
  }

  return { tasks };
};

// Private Actions
const _addTask = makeActionCreator(TASK_ACTIONS.ADD, 'response');
const _destroyTask = makeActionCreator(TASK_ACTIONS.REMOVE, 'response');
const _destroyAllTasks = makeActionCreator(TASK_ACTIONS.REMOVE_ALL, 'response');
const _updateTask = makeActionCreator(TASK_ACTIONS.UPDATE, 'response');
const _copyTask = makeActionCreator(TASK_ACTIONS.COPY, 'response');
const _startTask = makeActionCreator(TASK_ACTIONS.START, 'response');
const _startAllTasks = makeActionCreator(TASK_ACTIONS.START_ALL, 'response');
const _stopTask = makeActionCreator(TASK_ACTIONS.STOP, 'response');
const _stopAllTasks = makeActionCreator(TASK_ACTIONS.STOP_ALL, 'response');

// Public Actions
const editTask = makeActionCreator(TASK_ACTIONS.EDIT, 'id', 'field', 'value');
const selectTask = makeActionCreator(TASK_ACTIONS.SELECT, 'task');
const statusTask = makeActionCreator(TASK_ACTIONS.STATUS, 'messageBuffer');
const handleError = makeActionCreator(TASK_ACTIONS.ERROR, 'action', 'error');

// Public Thunks
const addTask = (task, amount) => dispatch =>
  _addTaskRequest(task, amount).then(
    response => dispatch(_addTask(response)),
    error => dispatch(handleError(TASK_ACTIONS.ADD, error)),
  );

const destroyTask = (task, type) => dispatch =>
  _destroyTaskRequest(task, type).then(
    response => dispatch(_destroyTask(response)),
    error => dispatch(handleError(TASK_ACTIONS.REMOVE, error)),
  );

const destroyAllTasks = tasks => dispatch =>
  _destroyAllTasksRequest(tasks).then(
    response => dispatch(_destroyAllTasks(response)),
    error => dispatch(handleError(TASK_ACTIONS.REMOVE_ALL, error)),
  );

const updateTask = (id, task) => (dispatch, getState) =>
  _updateTaskRequest(id, task).then(
    response => {
      dispatch(_updateTask(response));
      const state = getState();
      if (state.selectedTask && state.selectedTask.id === response.id) {
        dispatch(selectTask(null));
      }
    },
    error => dispatch(handleError(TASK_ACTIONS.UPDATE, error)),
  );

const clearEdits = (id, task) => {
  // Clear the edits so the update clears them out properly
  const copy = JSON.parse(JSON.stringify(task));
  copy.edits = null;
  return (dispatch, getState) =>
    _updateTaskRequest(id, copy).then(
      response => {
        dispatch(_updateTask(response));
        const state = getState();
        if (state.selectedTask && state.selectedTask.id === response.id) {
          dispatch(selectTask(null));
        }
      },
      error => dispatch(handleError(TASK_ACTIONS.UPDATE, error)),
    );
};

const copyTask = task => dispatch =>
  _copyTaskRequest(task).then(
    response => dispatch(_copyTask(response)),
    error => dispatch(handleError(TASK_ACTIONS.COPY, error)),
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
  EDIT_USERNAME: 'EDIT_USERNAME',
  EDIT_PASSWORD: 'EDIT_PASSWORD',
  EDIT_SITE: 'EDIT_SITE',
  EDIT_PROFILE: 'EDIT_PROFILE',
  EDIT_SIZES: 'EDIT_SIZES',
  EDIT_AMOUNT: 'EDIT_AMOUNT',
  TOGGLE_CAPTCHA: 'TOGGLE_CAPTCHA',
  EDIT_TASK_TYPE: 'EDIT_TASK_TYPE',
};

export const taskActions = {
  add: addTask,
  destroy: destroyTask,
  destroyAll: destroyAllTasks,
  edit: editTask,
  clearEdits,
  select: selectTask,
  update: updateTask,
  status: statusTask,
  copy: copyTask,
  start: startTask,
  startAll: startAllTasks,
  stop: stopTask,
  stopAll: stopAllTasks,
  error: handleError,
};

export const mapTaskFieldsToKey = {
  [TASK_FIELDS.EDIT_PRODUCT]: 'product',
  [TASK_FIELDS.EDIT_USERNAME]: 'username',
  [TASK_FIELDS.EDIT_PASSWORD]: 'password',
  [TASK_FIELDS.EDIT_SITE]: 'site',
  [TASK_FIELDS.EDIT_PROFILE]: 'profile',
  [TASK_FIELDS.EDIT_SIZES]: 'sizes',
  [TASK_FIELDS.EDIT_AMOUNT]: 'amount',
  [TASK_FIELDS.EDIT_TASK_TYPE]: 'type',
  [TASK_FIELDS.TOGGLE_CAPTCHA]: 'captcha',
};
