import makeActionCreator from './creator';
import prefixer from './reducers/prefixer';

/**
 * This file is a shared import point for all actions.
 */
import * as app from '../app/state/actions';
import * as profiles from '../profiles/state/actions';
import * as task from '../tasks/state/actions';
import * as settings from '../settings/state/actions';
import * as navbar from '../navbar/state/actions';


const prefix = '@@Global';
const globalActionsList = ['RESET', 'IMPORT', 'MIGRATE'];

export const GLOBAL_ACTIONS = prefixer(prefix, globalActionsList);

export const globalActions = {
  reset: makeActionCreator(GLOBAL_ACTIONS.RESET),
  import: makeActionCreator(GLOBAL_ACTIONS.IMPORT, 'state'),
  migrate: makeActionCreator(GLOBAL_ACTIONS.MIGRATE),
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
  settingsActions,
  mapSettingsFieldToKey,
  SHARED_ACTIONS,
  ACCOUNT_ACTIONS,
  WEBHOOK_ACTIONS,
  SHIPPING_ACTIONS,
  SETTINGS_FIELDS,
} = settings;

export const { navbarActions, mapActionsToRoutes, NAVBAR_ACTIONS, ROUTES } = navbar;

export const { APP_ACTIONS, appActions } = app;
