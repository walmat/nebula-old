/**
 * This file is merely a shared import point for all actions.
 */

import * as profiles from './actions/profiles/profileActions';
import * as task from './actions/tasks/taskActions';
import * as settings from './actions/settings/settingsActions';
import * as server from './actions/server/serverActions';

export const {
  profileActions,
  mapProfileFieldToKey,
  PROFILE_ACTIONS,
  PROFILE_FIELDS,
  PAYMENT_FIELDS,
  LOCATION_FIELDS,
} = profiles;

export const {
  taskActions,
  TASK_ACTIONS,
  TASK_FIELDS,
} = task;

export const {
  serverActions,
  mapServerFieldToKey,
  SERVER_ACTIONS,
  SERVER_FIELDS,
} = server;

export const {
  settingsActions,
  SETTINGS_ACTIONS,
  SETTINGS_FIELDS,
} = settings;
