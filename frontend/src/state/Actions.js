/**
 * This file is merely a shared import point for all actions.
 */

import * as profiles from './actions/profiles/ProfileActions';
import * as location from './actions/profiles/LocationActions';
import * as payment from './actions/profiles/PaymentActions';

export const PROFILE_FIELDS = profiles.PROFILE_FIELDS;
export const LOCATION_FIELDS = location.LOCATION_FIELDS;
export const PAYMENT_FIELDS = payment.PAYMENT_FIELDS;

export const PROFILE_ACTIONS = {
  ADD: profiles.ADD_PROFILE,
  REMOVE: profiles.REMOVE_PROFILE,
  EDIT: profiles.EDIT_PROFILE
};
export const profileActions = {
  add: profiles.addProfile,
  remove: profiles.removeProfile,
  edit: profiles.editProfile
};
