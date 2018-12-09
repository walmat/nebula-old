import _ from 'underscore';
import makeActionCreator from '../actionCreator';
import regexes from '../../../utils/validation';

// Top level Actions
export const TASK_ACTIONS = {
  ADD: 'ADD_TASK',
  REMOVE: 'REMOVE_TASK',
  EDIT: 'EDIT_TASK',
  SELECT: 'SELECT_TASK',
  UPDATE: 'UPDATE_TASK',
  STATUS: 'UPDATE_STATUS',
  START: 'START_TASK',
  STOP: 'STOP_TASK',
  ERROR: 'TASK_HANDLE_ERROR',
};

// Utility
const _parseTaskProduct = product => {
  const kws = product.raw
    .split(',')
    .reduce((a, x) => a.concat(x.trim().split(' ')), []);

  const validKeywords = kws.every(kw => regexes.keywordRegex.test(kw));

  if (regexes.urlRegex.test(product.raw)) {
    // test a url match
    return {
      ...product,
      url: product.raw,
    };
  }

  if (regexes.variantRegex.test(product.raw)) {
    // test variant match
    return {
      ...product,
      variant: product.raw,
    };
  }

  if (validKeywords) {
    // test keyword match
    const posKeywords = [];
    const negKeywords = [];
    kws.forEach(kw => {
      if (kw.startsWith('+')) {
        // positive keywords
        posKeywords.push(kw.slice(1, kw.length));
      } else {
        // negative keywords
        negKeywords.push(kw.slice(1, kw.length));
      }
    });
    return {
      ...product,
      pos_keywords: posKeywords,
      neg_keywords: negKeywords,
    };
  }
  return null;
};

// Private API Requests
const _addTaskRequest = async task => {
  const copy = JSON.parse(JSON.stringify(task));
  const parsedProduct = _parseTaskProduct(copy.product);

  if (parsedProduct) {
    copy.product = parsedProduct;
    return { task: copy };
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
  const parsedProduct = _parseTaskProduct({
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

const _statusTaskRequest = async (id, message) => {
  if (id) {
    return {
      id,
      message,
    };
  }
  throw new Error('Invalid task structure');
};

const _startTaskRequest = async (task, proxies) => {
  if (task.status === 'running') {
    throw new Error('Already running');
  } else {
    if (window.Bridge) {
      window.Bridge.startTasks(task);
    }
    return { task };
  }
};

const _stopTaskRequest = async task => {
  if (task.status === 'stopped') {
    throw new Error('Already stopped');
  } else {
    if (window.Bridge) {
      window.Bridge.stopTasks(task);
    }
    return { task };
  }
};

// Private Actions
const _addTask = makeActionCreator(TASK_ACTIONS.ADD, 'response');
const _destroyTask = makeActionCreator(TASK_ACTIONS.REMOVE, 'response');
const _updateTask = makeActionCreator(TASK_ACTIONS.UPDATE, 'response');
const _statusTask = makeActionCreator(TASK_ACTIONS.STATUS, 'response');
const _startTask = makeActionCreator(TASK_ACTIONS.START, 'response');
const _stopTask = makeActionCreator(TASK_ACTIONS.STOP, 'response');

// Public Actions
const editTask = makeActionCreator(TASK_ACTIONS.EDIT, 'id', 'field', 'value');
const selectTask = makeActionCreator(TASK_ACTIONS.SELECT, 'task');
const handleError = makeActionCreator(TASK_ACTIONS.ERROR, 'action', 'error');

// Public Thunks
const addTask = task => dispatch =>
  _addTaskRequest(task).then(
    response => dispatch(_addTask(response)),
    error => dispatch(handleError(TASK_ACTIONS.ADD, error)),
  );

const destroyTask = (task, type) => dispatch =>
  _destroyTaskRequest(task, type).then(
    response => dispatch(_destroyTask(response)),
    error => dispatch(handleError(TASK_ACTIONS.REMOVE, error)),
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

const statusTask = (id, message) => dispatch =>
  _statusTaskRequest(id, message).then(
    response => dispatch(_statusTask(response)),
    error => dispatch(handleError(TASK_ACTIONS.STATUS, error)),
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

const startTask = (task, proxies) => dispatch =>
  _startTaskRequest(task, proxies).then(
    response => dispatch(_startTask(response)),
    error => dispatch(handleError(TASK_ACTIONS.START, error)),
  );

const stopTask = task => dispatch =>
  _stopTaskRequest(task).then(
    response => dispatch(_stopTask(response)),
    error => dispatch(handleError(TASK_ACTIONS.STOP, error)),
  );

// Field Edits
export const TASK_FIELDS = {
  EDIT_PRODUCT: 'EDIT_PRODUCT',
  EDIT_USERNAME: 'EDIT_USERNAME',
  EDIT_PASSWORD: 'EDIT_PASSWORD',
  EDIT_SITE: 'EDIT_SITE',
  EDIT_PROFILE: 'EDIT_PROFILE',
  EDIT_SIZES: 'EDIT_SIZES',
};

export const taskActions = {
  add: addTask,
  destroy: destroyTask,
  edit: editTask,
  clearEdits,
  select: selectTask,
  update: updateTask,
  status: statusTask,
  start: startTask,
  stop: stopTask,
  error: handleError,
};

export const mapTaskFieldsToKey = {
  [TASK_FIELDS.EDIT_PRODUCT]: 'product',
  [TASK_FIELDS.EDIT_USERNAME]: 'username',
  [TASK_FIELDS.EDIT_PASSWORD]: 'password',
  [TASK_FIELDS.EDIT_SITE]: 'site',
  [TASK_FIELDS.EDIT_PROFILE]: 'profile',
  [TASK_FIELDS.EDIT_SIZES]: 'sizes',
};
