import {
  TASK_ACTIONS,
  TASK_FIELDS,
} from '../../actions';

export const initialTaskState = {
  sku: '',
  billing: {},
  sizes: {},
  pairs: 0,
  errors: {
    sku: null,
    billing: null,
    sizes: null,
    pairs: null,
  },
};

export function taskReducer(state = initialTaskState, action) {
  let change = {};
  if (action.type === TASK_ACTIONS.EDIT) {
    switch (action.field) {
      case TASK_FIELDS.EDIT_SKU:
        change = {
          sku: action.value,
        };
        break;
      case TASK_FIELDS.EDIT_BILLING:
        change = {
          billing: action.value,
        };
        break;
      case TASK_FIELDS.EDIT_SIZES:
        change = {
          sizes: action.value,
        };
        break;
      case TASK_FIELDS.EDIT_PAIRS:
        change = {
          pairs: action.value,
        };
        break;
      default:
        change = {};
    }
  }
  change.errors = action.errors;

  return Object.assign({}, state, change);
}
