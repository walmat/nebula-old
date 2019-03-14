import { initialState } from '../migrators';

const { newTask: task, tasks: list } = initialState;

export default {
  task,
  list,
  log: {
    id: null,
    site: null,
    output: null,
  },
  errors: task.errors,
  edit: task.edits,
  editErrors: task.edits.errors,
  product: task.product,
  productErrors: {
    raw: null,
    variant: null,
    pos_keywords: null,
    neg_keywords: null,
    url: null,
  },
  site: task.site,
};
