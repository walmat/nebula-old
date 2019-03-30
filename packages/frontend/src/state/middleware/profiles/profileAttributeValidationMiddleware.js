import {
  PROFILE_ACTIONS,
  PROFILE_FIELDS,
  profileActions,
  mapProfileFieldToKey,
} from '../../actions';
import profileAttributeValidatorMap from '../../../utils/validation/profileAttributeValidators';

const profileAttributeValidationMiddleware = store => next => action => {
  // Only activate this middleware when the action is editing a profile
  if (
    action.type !== PROFILE_ACTIONS.EDIT ||
    action.field === PROFILE_FIELDS.EDIT_RATES ||
    action.field === PROFILE_FIELDS.EDIT_SELECTED_SITE
  ) {
    return next(action);
  }

  // Get the state and set the errors map
  const state = store.getState();

  // Choose the correct profile to validate
  let profile = state.currentProfile;
  if (action.id !== null) {
    profile = state.profiles.find(p => p.id === action.id);
    if (profile === undefined) {
      // No profile found, continue with next middleware/reducer
      return next(action);
    }
  }

  // Check for valid payload structure and dispatch an error if invalid
  if (!action.field || (!action.value && action.value !== '')) {
    return store.dispatch(profileActions.error(action.type, 'invalid action structure!'));
  }

  const newAction = JSON.parse(JSON.stringify(action));
  // Get the correct errors object and call the correct validator
  if (
    [
      PROFILE_FIELDS.EDIT_NAME,
      PROFILE_FIELDS.EDIT_BILLING_MATCHES_SHIPPING,
      PROFILE_FIELDS.TOGGLE_BILLING_MATCHES_SHIPPING,
    ].includes(newAction.field)
  ) {
    newAction.errors = Object.assign({}, profile.errors);
    // Call the correct validator to fill in the new error state
    newAction.errors[mapProfileFieldToKey[newAction.field]] = !profileAttributeValidatorMap[
      newAction.field
    ](newAction.value);
  } else if (!action.subField) {
    // Required sub-field is not given, throw an error
    return store.dispatch(profileActions.error(action.type, 'invalid action structure!'));
  } else {
    newAction.errors = Object.assign({}, profile[mapProfileFieldToKey[newAction.field]].errors);
    // Call the correct validator to fill in the new error state
    newAction.errors[newAction.subField] = !profileAttributeValidatorMap[newAction.field][
      newAction.subField
    ](newAction.value);
  }

  // Continue on to next middleware/reducer with errors map filled in.
  return next(newAction);
};

export default profileAttributeValidationMiddleware;
