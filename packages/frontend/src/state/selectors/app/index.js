import { createSelector } from 'reselect';
import { initialState } from '../../migrators';

const make = (state, props) => state || {};

export const makeTasks = createSelector(
  make,
  state => (state ? state.tasks : initialState.tasks),
);

export const makeTheme = createSelector(
  make,
  state => (state ? state.theme : initialState.theme),
);

export const makeToggleSettings = createSelector(
  make,
  state => (state ? state.toggleSettings : initialState.toggleSettings),
);

export const makeEnableAutoUpdateCheck = createSelector(
  make,
  state => (state ? state.enableAutoUpdateCheck : initialState.enableAutoUpdateCheck),
);

export const makeEnableAnalytics = createSelector(
  make,
  state => (state ? state.enableAnalytics : initialState.enableAnalytics),
);

export const makeEnableMonitorPooling = createSelector(
  make,
  state => (state ? state.enableMonitorPooling : initialState.enableMonitorPooling),
);
