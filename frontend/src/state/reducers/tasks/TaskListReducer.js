import {TASK_FIELDS, TASK_ACTIONS} from '../../Actions';

export const initialTaskListState = [];

export function taskListReducer(state = initialTaskListState, action) {
    let change = {};
    if (action.type === TASK_FIELDS.EDIT && action.id !== null) {
        switch (action.field) {
            case TASK_FIELDS.EDIT_SKU:
                change = {
                    sku: action.value
                };
                break;
            case TASK_FIELDS.EDIT_BILLING:
                change = {
                    billing: action.value
                };
                break;
            case TASK_FIELDS.EDIT_SIZES:
                change = {
                    sizes: action.value
                };
                break;
            case TASK_FIELDS.EDIT_PAIRS:
                change = {
                    pairs: action.value
                };
                break;
            default:
                change = {};
        }
    }
    else if (action.type === TASK_ACTIONS.ADD) {
        let newTask = Object.assign({}, action.task);
        newTask.id = state.length;
        return state.slice().push(newTask);
    }
    else if (action.type === TASK_ACTIONS.REMOVE) {
        return state.filter(task => {
            return task !== action.id;
        });
    }
    change.errors = action.errors;

    return Object.assign({}, state, change);
}
