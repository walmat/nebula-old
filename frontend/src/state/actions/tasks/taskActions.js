import makeActionCreator from '../actionCreator';

export const TASK_ACTIONS = {
  ADD: 'ADD_TASK',
  REMOVE: 'REMOVE_TASK',
  EDIT: 'EDIT_TASK',
  SELECT: 'SELECT_TASK',
  LOAD: 'LOAD_TASK',
  UPDATE: 'UPDATE_TASK'
};

export const addTask = makeActionCreator(TASK_ACTIONS.ADD, 'task');
export const removeTask = makeActionCreator(TASK_ACTIONS.REMOVE, 'id');
export const editTask = makeActionCreator(TASK_ACTIONS.EDIT, 'id', 'field', 'value');
export const selectTask = makeActionCreator(TASK_ACTIONS.SELECT, 'task');
export const updateTask = makeActionCreator(TASK_ACTIONS.UPDATE, 'id', 'task');
export const loadTask = makeActionCreator(TASK_ACTIONS.LOAD, 'task');

// Field Edits
export const TASK_FIELDS = {
  EDIT_SKU: 'EDIT_SKU',
  EDIT_BILLING: 'EDIT_BILLING',
  EDIT_SIZES: 'EDIT_SIZES',
  EDIT_PAIRS: 'EDIT_PAIRS',
};

export const taskActions = {
  add: addTask,
  remove: removeTask,
  edit: editTask,
  select: selectTask,
  load: loadTask,
  update: updateTask
};

export const mapTasksFieldToKey = {
  [TASK_FIELDS.EDIT_BILLING]: 'billing',
  [TASK_FIELDS.EDIT_PAIRS]: 'pairs',
  [TASK_FIELDS.EDIT_SIZES]: 'sizes',
  [TASK_FIELDS.EDIT_SKU]: 'sku'
}