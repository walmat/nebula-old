/**
 * This file is merely a shared import point for all actions.
 */

import * as profiles from './actions/profiles/profileActions';
import * as task from './actions/tasks/taskActions';
import * as settings from './actions/settings/settingsActions';
import * as server from './actions/server/serverActions';
import * as navbar from './actions/navbar/navbarActions';

export const {
  profileActions,
  mapProfileFieldToKey,
  mapLocationFieldToKey,
  mapPaymentFieldToKey,
  PROFILE_ACTIONS,
  PROFILE_FIELDS,
  PAYMENT_FIELDS,
  LOCATION_FIELDS,
} = profiles;

export const {
  taskActions,
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

export const {
  navbarActions,
  mapActionsToRoutes,
  NAVBAR_ACTIONS,
  ROUTES,
} = navbar;
