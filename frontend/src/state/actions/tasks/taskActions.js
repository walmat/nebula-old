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
  new Promise((resolve) => {
    setTimeout(() => {
      const copy = JSON.parse(JSON.stringify(task));
      resolve({ task: copy });
    }, 1000);
  });

const _removeTaskRequest = async id =>
  // TODO: Replace this with an actual API call
  new Promise((resolve) => {
    setTimeout(() => {
      resolve({ id });
    }, 1000);
  });

const _updateTaskRequest = async (id, task) =>
  // TODO: Replace this with an actual API call
  new Promise((resolve) => {
    setTimeout(() => {
      resolve({ id, task });
    }, 1000);
  });

const _startTaskRequest = async id =>
  // TODO: Replace this with an actual API call
  new Promise((resolve) => {
    setTimeout(() => {
      resolve({ id });
    }, 1000);
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
const _removeTask = makeActionCreator(TASK_ACTIONS.REMOVE, 'response');
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

const removeTask = id =>
  dispatch => _removeTaskRequest(id).then(
    response => dispatch(_removeTask(response)),
    error => dispatch(handleError(TASK_ACTIONS.REMOVE, error)),
  );

const updateTask = (id, task) =>
  dispatch => _updateTaskRequest(id, task).then(
    response => dispatch(_updateTask(response)),
    error => dispatch(handleError(TASK_ACTIONS.UPDATE, error)),
  );

const startTask = id =>
  dispatch => _startTaskRequest(id).then(
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
  EDIT_SKU: 'EDIT_SKU',
  EDIT_PROFILE: 'EDIT_PROFILE',
  EDIT_SIZES: 'EDIT_SIZES',
  EDIT_PAIRS: 'EDIT_PAIRS',
};

export const taskActions = {
  add: addTask,
  remove: removeTask,
  edit: editTask,
  select: selectTask,
  load: loadTask,
  update: updateTask,
  start: startTask,
  stop: stopTask,
};
