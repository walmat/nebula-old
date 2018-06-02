/**
 * This file is merely a shared import point for all actions.
 */

import * as profiles from './profiles/ProfileActions';
import { editLocation, EDIT LOCATIONS, LOCATION_FIELDS } from './profiles/LocationActions';

export const editLocation = editLocation;
export const EDIT_LOCATION = EDIT_LOCATION;
export const LOCATION_FIELDS = LOCATION_FIELDS;

export const PROFILE_ACTIONS {
  ADD: profiles.ADD_PROFILE,
  REMOVE: profiles.REMOVE_PROFILE,
  EDIT: profiles.EDIT_PROFILE
};
export const profileActions {
  add: profiles.addProfile,
  remove: profiles.removeProfile,
  edit: profiles.editProfile
};
