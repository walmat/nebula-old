/**
 * This file is a shared import point for all actions.
 */
import makeActionCreator from './actions/actionCreator';

import * as profiles from './actions/profiles/profileActions';
import * as task from './actions/tasks/taskActions';
import * as settings from './actions/settings/settingsActions';
import * as server from './actions/server/serverActions';
import * as navbar from './actions/navbar/navbarActions';

// Global Actions
export const GLOBAL_ACTIONS = {
  RESET: '@@RESET',
  IMPORT: '@@IMPORT',
  SET_THEME: '@@SET_THEME',
  FETCH_SITES: '@@FETCH_SITES',
  MIGRATE_STATE: '@@MIGRATE_STATE',
  INIT: '@@INIT',
};

export const globalActions = {
  reset: makeActionCreator(GLOBAL_ACTIONS.RESET),
  import: makeActionCreator(GLOBAL_ACTIONS.IMPORT, 'state'),
  setTheme: makeActionCreator(GLOBAL_ACTIONS.SET_THEME, 'theme'),
  migrateState: makeActionCreator(GLOBAL_ACTIONS.MIGRATE_STATE),
  fetchSites: makeActionCreator(GLOBAL_ACTIONS.FETCH_SITES, 'sites'),
};

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

export const { taskActions, mapTaskFieldsToKey, TASK_ACTIONS, TASK_FIELDS } = task;

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
