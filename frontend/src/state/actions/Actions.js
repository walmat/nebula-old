/**
 * This file is merely a shared import point for all actions.
 */

import * as profiles from './profiles/ProfileActions';

export const EDIT_SHIPPING = profiles.EDIT_SHIPPING;
export const LOCATION_FIELDS = profiles.LOCATION_FIELDS;

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
