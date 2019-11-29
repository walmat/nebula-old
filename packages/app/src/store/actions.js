import makeActionCreator from './creator';
/**
 * This file is a shared import point for all actions.
 */
import * as app from '../app/state/actions';
import * as profiles from '../profiles/state/actions';
import * as task from '../tasks/state/actions';
import * as settings from '../settings/state/actions';
import * as navbar from '../navbar/state/actions';

export const GLOBAL_ACTIONS = {
  RESET: '@@RESET',
  IMPORT: '@@IMPORT',
  FETCH_SITES: '@@FETCH_SITES',
  MIGRATE_STATE: '@@MIGRATE_STATE',
  INIT: '@@INIT',
};

export const globalActions = {
  migrateState: makeActionCreator(GLOBAL_ACTIONS.MIGRATE_STATE),
  fetchSites: makeActionCreator(GLOBAL_ACTIONS.FETCH_SITES, 'sites'),
  reset: makeActionCreator(GLOBAL_ACTIONS.RESET),
  import: makeActionCreator(GLOBAL_ACTIONS.IMPORT, 'state'),
}

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
  settingsActions,
  mapSettingsFieldToKey,
  SETTINGS_ACTIONS,
  SETTINGS_FIELDS,
} = settings;

export const { navbarActions, mapActionsToRoutes, NAVBAR_ACTIONS, ROUTES } = navbar;

export const { APP_ACTIONS, appActions } = app;
