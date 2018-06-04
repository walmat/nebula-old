import makeActionCreator from '../ActionCreator';

// Top level Actions
export const ADD_TASK = 'ADD_TASK';
export const REMOVE_TASK = 'REMOVE_TASK';
export const EDIT_TASK = 'EDIT_TASK';

export const addTask = makeActionCreator(ADD_TASK, 'profile');
export const removeTask = makeActionCreator(REMOVE_TASK, 'id');
export const editTask = makeActionCreator(EDIT_TASK, 'sku', 'size', 'billing');

// Field Edits
export const TASK_FIELDS = {
    EDIT_SKU: 'EDIT_SKU',
    EDIT_BILLING: 'EDIT_BILLING',
    EDIT_SIZES: 'EDIT_SIZES',
    EDIT_PAIRS: 'EDIT_PAIRS',
};
