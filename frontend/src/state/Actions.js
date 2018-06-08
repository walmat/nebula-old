/**
 * This file is merely a shared import point for all actions.
 */

import * as profiles from './actions/profiles/ProfileActions';
import * as location from './actions/profiles/LocationActions';
import * as payment from './actions/profiles/PaymentActions';
import * as task from './actions/tasks/TaskActions';
import * as settings from './actions/settings/SettingsActions';
import * as server from './actions/server/ServerActions';

export const PROFILE_FIELDS = profiles.PROFILE_FIELDS;
export const PROFILE_ACTIONS = profiles.PROFILE_ACTIONS;
export const profileActions = profiles.profileActions;
export const mapProfileFieldToKey = profiles.mapProfileFieldToKey;
export const LOCATION_FIELDS = location.LOCATION_FIELDS;
export const PAYMENT_FIELDS = payment.PAYMENT_FIELDS;

export const TASK_FIELDS = task.TASK_FIELDS;
export const TASK_ACTIONS = task.TASK_ACTIONS;
export const taskActions = task.taskActions;

export const SERVER_FIELDS = server.SERVER_FIELDS;
export const SERVER_ACTIONS = server.SERVER_ACTIONS;
export const serverActions = server.serverActions;

export const SETTINGS_FIELDS = settings.SETTINGS_FIELDS;
export const SETTINGS_ACTIONS = settings.SETTINGS_ACTIONS;
export const settingsActions = settings.settingsActions;
