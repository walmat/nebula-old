import { createSelector } from 'reselect';
import { CurrentTask, Tasks } from '../initial';
import { States } from '../../../constants/tasks';

export const makeTasks = createSelector(
  state => state.Tasks || Tasks,
  state => state || Tasks,
);

export const makeRunningTasks = createSelector(
  state => state.Tasks || Tasks,
  state => state.filter(t => t.state === States.Running),
);

export const makeSelectedTasks = createSelector(
  state => state.Tasks || Tasks,
  state => state.filter(t => t.selected),
);

export const makeCurrentTask = createSelector(
  state => state.CurrentTask || CurrentTask,
  state => state || CurrentTask,
);
