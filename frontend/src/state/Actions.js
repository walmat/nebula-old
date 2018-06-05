/**
 * This file is merely a shared import point for all actions.
 */

import * as profiles from './actions/profiles/ProfileActions';
import * as location from './actions/profiles/LocationActions';
import * as payment from './actions/profiles/PaymentActions';
import * as task from './actions/tasks/TaskActions';

export const PROFILE_FIELDS = profiles.PROFILE_FIELDS;
export const PROFILE_ACTIONS = profiles.PROFILE_ACTIONS;
export const profileActions = profiles.profileActions;
export const mapProfileFieldToKey = profiles.mapProfileFieldToKey;

export const LOCATION_FIELDS = location.LOCATION_FIELDS;
export const PAYMENT_FIELDS = payment.PAYMENT_FIELDS;
export const TASK_FIELDS = task.TASK_FIELDS;

export const TASK_ACTIONS = {
  ADD: task.ADD_TASK,
  REMOVE: task.REMOVE_TASK,
  EDIT: task.EDIT_TASK
};

export const taskActions = {
    add: task.addTask,
    remove: task.removeTask,
    edit: task.editTask
};
