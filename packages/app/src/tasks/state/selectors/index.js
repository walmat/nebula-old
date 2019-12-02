import { createSelector } from 'reselect';
import { CurrentTask, SelectedTask, Tasks } from '../initial';

export const makeTasks = createSelector(
  state => state.Tasks || Tasks,
  state => state || Tasks,
);

export const makeRunningTasks = createSelector(
  state => state.Tasks || Tasks,
  state => (state || Tasks).filter(t => t.status === 'running'),
);

export const makeCurrentTask = createSelector(
  state => state.CurrentTask || CurrentTask,
  state => state || CurrentTask,
);

export const makeSelectedTask = createSelector(
  state => state.SelectedTasks || SelectedTask,
  state => state || SelectedTask,
);
