import makeActionCreator from '../actionCreator';

// Top level Actions
export const TASK_ACTIONS = {
  ADD: 'ADD_TASK',
  REMOVE: 'REMOVE_TASK',
  EDIT: 'EDIT_TASK',
  SELECT: 'SELECT_TASK',
  LOAD: 'LOAD_TASK',
  UPDATE: 'UPDATE_TASK',
  START: 'START_TASK',
  STOP: 'STOP_TASK',
  ERROR: 'TASK_HANDLE_ERROR',
};

// Private API Requests
const _addTaskRequest = async task =>
  // TODO: Replace this with an actual API call
  new Promise((resolve, reject) => {
    const product = task.product.raw.split(',').reduce((a, x) => a.concat(x.trim().split(' ')), [])
    console.log(product);
    const isKeywords = product.map(val => /^[+-][A-Za-z]+$/.test(val));
    console.log(isKeywords);
    if (isKeywords.some(val => val === false)) {
      reject(); // add reason
    } else {
      setTimeout(() => {
        const copy = JSON.parse(JSON.stringify(task));
        resolve({ task: copy });
      }, 0);
    }
  });

const _destroyTaskRequest = async id =>
  // TODO: Replace this with an actual API call
  new Promise((resolve) => {
    setTimeout(() => {
      resolve({ id });
    }, 0);
  });

const _updateTaskRequest = async (id, task) =>
  // TODO: Replace this with an actual API call
  new Promise((resolve) => {
    setTimeout(() => {
      resolve({ id, task });
    }, 0);
  });

const _startTaskRequest = async task =>
  // TODO: Replace this with an actual API call
  new Promise((resolve) => {
    setTimeout(() => {
      resolve({ task });
    }, 1000);
    // try {
    //   const response = fetch('http://localhost:8080/tasks', {
    //     method: 'POST',
    //     headers: {
    //       Accept: 'application/json',
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify(task),
    //   });
    //   const result = response.json();
    //   resolve(result);
    // } catch (err) {
    //   resolve(err);
    // }
  });

const _stopTaskRequest = async id =>
  // TODO: Replace this with an actual API call
  new Promise((resolve) => {
    setTimeout(() => {
      resolve({ id });
    }, 1000);
  });

// Private Actions
const _addTask = makeActionCreator(TASK_ACTIONS.ADD, 'response');
const _destroyTask = makeActionCreator(TASK_ACTIONS.REMOVE, 'response');
const _updateTask = makeActionCreator(TASK_ACTIONS.UPDATE, 'response');
const _startTask = makeActionCreator(TASK_ACTIONS.START, 'response');
const _stopTask = makeActionCreator(TASK_ACTIONS.STOP, 'response');

// Public Actions
const editTask = makeActionCreator(TASK_ACTIONS.EDIT, 'id', 'field', 'value');
const selectTask = makeActionCreator(TASK_ACTIONS.SELECT, 'task');
const loadTask = makeActionCreator(TASK_ACTIONS.LOAD, 'task');
const handleError = makeActionCreator(TASK_ACTIONS.ERROR, 'action', 'error');

// Public Thunks
const addTask = task =>
  dispatch => _addTaskRequest(task).then(
    response => dispatch(_addTask(response)),
    error => dispatch(handleError(TASK_ACTIONS.ADD, error)),
  );

const destroyTask = id =>
  dispatch => _destroyTaskRequest(id).then(
    response => dispatch(_destroyTask(response)),
    error => dispatch(handleError(TASK_ACTIONS.DESTROY, error)),
  );

const updateTask = (id, task) =>
  dispatch => _updateTaskRequest(id, task).then(
    response => dispatch(_updateTask(response)),
    error => dispatch(handleError(TASK_ACTIONS.UPDATE, error)),
  );

const startTask = task =>
  dispatch => _startTaskRequest(task).then(
    response => dispatch(_startTask(response)),
    error => dispatch(handleError(TASK_ACTIONS.START, error)),
  );

const stopTask = id =>
  dispatch => _stopTaskRequest(id).then(
    response => dispatch(_stopTask(response)),
    error => dispatch(handleError(TASK_ACTIONS.STOP, error)),
  );

// Field Edits
export const TASK_FIELDS = {
  EDIT_PRODUCT: 'EDIT_PRODUCT',
  EDIT_METHOD: 'EDIT_METHOD',
  EDIT_SITE: 'EDIT_SITE',
  EDIT_PROFILE: 'EDIT_PROFILE',
  EDIT_SIZES: 'EDIT_SIZES',
  EDIT_PAIRS: 'EDIT_PAIRS',
};

export const taskActions = {
  add: addTask,
  destroy: destroyTask,
  edit: editTask,
  select: selectTask,
  load: loadTask,
  update: updateTask,
  start: startTask,
  stop: stopTask,
};

export const mapTaskFieldsToKey = {
  [TASK_FIELDS.EDIT_PRODUCT]: 'product',
  [TASK_FIELDS.EDIT_METHOD]: 'method',
  [TASK_FIELDS.EDIT_SITE]: 'site',
  [TASK_FIELDS.EDIT_PROFILE]: 'profile',
  [TASK_FIELDS.EDIT_SIZES]: 'sizes',
  [TASK_FIELDS.EDIT_PAIRS]: 'pairs',
};
