import makeActionCreator from '../actionCreator';

export const TASK_ACTIONS = {
  ADD: 'ADD_TASK',
  REMOVE: 'REMOVE_TASK',
  EDIT: 'EDIT_TASK',
  SELECT: 'SELECT_TASK',
  LOAD: 'LOAD_TASK',
  UPDATE: 'UPDATE_TASK',
  START: 'START_TASK',
  STOP: 'STOP_TASK',
};

export const addTask = makeActionCreator(TASK_ACTIONS.ADD, 'task');
export const removeTask = makeActionCreator(TASK_ACTIONS.REMOVE, 'id');
export const editTask = makeActionCreator(TASK_ACTIONS.EDIT, 'id', 'field', 'value');
export const selectTask = makeActionCreator(TASK_ACTIONS.SELECT, 'task');
export const updateTask = makeActionCreator(TASK_ACTIONS.UPDATE, 'id', 'task');
export const loadTask = makeActionCreator(TASK_ACTIONS.LOAD, 'task');
export const startTask = makeActionCreator(TASK_ACTIONS.START, 'task');
export const stopTask = makeActionCreator(TASK_ACTIONS.STOP, 'task');

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
