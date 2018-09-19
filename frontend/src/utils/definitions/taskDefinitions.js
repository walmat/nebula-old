import task, { initialTaskState } from './tasks/task';
import taskEdit, { initialTaskEditState } from './tasks/taskEdit';
import taskEditErrors, { initialTaskEditErrorState } from './tasks/taskEditErrors';
import taskErrors, { initialTaskErrorState } from './tasks/taskErrors';
import taskList, { initialTaskListState } from './tasks/taskList';
import taskProduct, { initialTaskProductState } from './tasks/taskProduct';
import taskProductErrors, { initialTaskProductErrorState } from './tasks/taskProductErrors';
import taskSite, { initialTaskSiteState } from './tasks/taskSite';

export const initialTaskStates = {
  task: initialTaskState,
  list: initialTaskListState,
  errors: initialTaskErrorState,
  edit: initialTaskEditState,
  editErrors: initialTaskEditErrorState,
  product: initialTaskProductState,
  productErrors: initialTaskProductErrorState,
  site: initialTaskSiteState,
};

export default {
  task,
  taskList,
  taskErrors,
  taskEdit,
  taskEditErrors,
  taskProduct,
  taskProductErrors,
  taskSite,
};
