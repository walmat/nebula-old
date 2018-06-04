import { PROFILE_ACTIONS, PROFILE_FIELDS, mapProfileFieldToKey } from '../../Actions';
import locationAttributeValidators from '../../../utils/validation/locationAttributeValidators';

const locationFormValidationMiddleware = field => store => next => action => {
    // Only activate this middleware when the action is editing a location form of a profile...
    if (action.type !== PROFILE_ACTIONS.EDIT || action.field !== field) {
        return next(action);
    }

    // Get the state and set the errors map
    const state = store.getState();
    action.errors = Object.assign({}, state.currentProfile[mapProfileFieldToKey[field]].errors);

    // Call the correct validator to fill in the new error state.
    action.errors[action.subField] = !locationAttributeValidators[action.subField](action.value);

    // Continue on to next middleware/reducer with errors map filled in.
    return next(action);
};

export default locationFormValidationMiddleware;
