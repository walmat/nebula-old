import {TASK_FIELDS, TASK_ACTIONS} from '../../Actions';
import {taskReducer} from "./TaskReducer";

export const initialTaskListState = [];

export function taskListReducer(state = initialTaskListState, action) {
    let change = {};
    if (action.type === TASK_FIELDS.EDIT && action.id !== null) {
        for (let i = 0; i < state.length; i++) {
            if (state[i].id === action.id) {
                taskReducer() //todo fin this
            }
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
