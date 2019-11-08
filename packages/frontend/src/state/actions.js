/**
 * This file is a shared import point for all actions.
 */
import * as app from './actions/app';
import * as profiles from './actions/profiles/profileActions';
import * as task from './actions/tasks/taskActions';
import * as settings from './actions/settings/settingsActions';
import * as server from './actions/server/serverActions';
import * as navbar from './actions/navbar/navbarActions';

export const { APP_ACTIONS, fetchSites, importState, migrateState, reset, setTheme } = app;

// Reimports
export const {
  profileActions,
  mapProfileFieldToKey,
  mapLocationFieldToKey,
  mapPaymentFieldToKey,
  mapRateFieldToKey,
  PROFILE_ACTIONS,
  RATES_FIELDS,
  PROFILE_FIELDS,
  PAYMENT_FIELDS,
  LOCATION_FIELDS,
} = profiles;

export const {
  addTask,
  clearEdits,
  copyTask,
  destroyAllTasks,
  destroyTask,
  editAllTasks,
  editTask,
  handleError,
  selectTask,
  startAllTasks,
  startTask,
  stopAllTasks,
  stopTask,
  updateTask,
  updateTaskStatus,
  mapTaskFieldsToKey,
  TASK_ACTIONS,
  TASK_FIELDS,
} = task;

export const {
  serverActions,
  mapServerFieldToKey,
  subMapToKey,
  SERVER_ACTIONS,
  SERVER_FIELDS,
} = server;

export const {
  settingsActions,
  mapSettingsFieldToKey,
  SETTINGS_ACTIONS,
  SETTINGS_FIELDS,
} = settings;

export const { navbarActions, mapActionsToRoutes, NAVBAR_ACTIONS, ROUTES } = navbar;
