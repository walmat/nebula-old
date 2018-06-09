import { PROFILE_ACTIONS, PROFILE_FIELDS, mapProfileFieldToKey } from '../../Actions';
import profileAttributeValidatorMap from '../../../utils/validation/profileAttributeValidators';

const profileAttributeValidationMiddleware = store => next => action => {
    // Only activate this middleware when the action is editing a profile
    if (action.type !== PROFILE_ACTIONS.EDIT) {
        return next(action);
    }

    // Get the state and set the errors map
    const state = store.getState();

    // Choose the correct profile to validate
    let profile = state.currentProfile;
    if (action.id != null) {
        profile = store.profiles.find(p => p.id === action.id);
        if (profile === undefined) {
            // No profile found, continue with next middleware/reducer
            return next(action);
        }
    }

    // Get the correct errors object and call the correct validator
    if(action.field === PROFILE_FIELDS.EDIT_NAME 
        || action.field === PROFILE_FIELDS.EDIT_BILLING_MATCHES_SHIPPING 
        || action.field === PROFILE_FIELDS.TOGGLE_BILLING_MATCHES_SHIPPING) {
        action.errors = Object.assign({}, profile.errors);
        // Call the correct validator to fill in the new error state
        action.errors[mapProfileFieldToKey[action.field]] = !profileAttributeValidatorMap[action.field](action.value);
    } else {
        action.errors = Object.assign({}, profile[mapProfileFieldToKey[action.field]].errors);
        // Call the correct validator to fill in the new error state
        action.errors[action.subField] = !profileAttributeValidatorMap[action.field][action.subField](action.value);
    }

    // Continue on to next middleware/reducer with errors map filled in.
    return next(action);
};

export default profileAttributeValidationMiddleware;