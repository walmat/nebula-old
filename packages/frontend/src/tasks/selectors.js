import { createSelector } from 'reselect';
import initialTaskStates from '../state/initial/tasks';

const make = (state, props) => state || {};

export const makeTasks = createSelector(
  make,
  state => (state ? state.tasks : initialTaskStates.list),
);

export const makeNewTask = createSelector(
  make,
  state => (state ? state.newTask : initialTaskStates.task),
);
