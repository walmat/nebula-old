import { createSelector } from 'reselect';
import { initialState } from '../../../store/migrators';

export const makeTasks = createSelector(
  (state, props) => state.Tasks || initialState.Tasks,
  state => state || initialState.Tasks,
);

export const makeNewTask = createSelector(
  (state, props) => state.NewTask || initialState.NewTask,
  state => state || initialState.NewTasks,
)

export const makeSelectedTask = createSelector(
  (state, props) => state.SelectedTasks || initialState.SelectedTasks,
  state => state || initialState.SelectedTasks,
);
