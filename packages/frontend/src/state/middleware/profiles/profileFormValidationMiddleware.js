/* eslint-disable no-case-declarations */
import {
  PROFILE_ACTIONS,
  PROFILE_FIELDS,
  profileActions,
  mapProfileFieldToKey,
  LOCATION_FIELDS,
} from '../../actions';
import profileAttributeValidatorMap from '../../../utils/validation/profileAttributeValidators';

const profileFormValidationMiddleware = store => next => action => {
  switch (action.type) {
    case PROFILE_ACTIONS.ADD:
    case PROFILE_ACTIONS.UPDATE:
      // Check for valid payload structure and dispatch an error if not
      if (!action.profile) {
        return store.dispatch(profileActions.error(action.type, 'invalid action structure!'));
      }

      // We are updating or adding a new profile, we need to validate all fields
      // and update errors map to make sure we have no errors.

      // Do a deep copy to ensure we aren't modifying any current state variables
      const newAction = JSON.parse(JSON.stringify(action));

      newAction.profile = JSON.parse(JSON.stringify(action.profile));
      newAction.errors = {};
      const { errors, profile } = newAction;
      let combinedErrors = false;

      // set the error maps correctly both on the profile and the action
      Object.entries(profileAttributeValidatorMap).forEach(pair => {
        // look at pairs of the attribute validator map, where pair[0] is the field and
        // pair[1] is the validator or sub validator map
        const [field] = pair;
        switch (field) {
          case PROFILE_FIELDS.EDIT_BILLING:
          case PROFILE_FIELDS.EDIT_SHIPPING:
          case PROFILE_FIELDS.EDIT_PAYMENT:
            // If we are looking at billing, but billing matches shipping, use shipping instead.
            let sourceField = field;
            if (field === PROFILE_FIELDS.EDIT_BILLING && profile.billingMatchesShipping) {
              sourceField = PROFILE_FIELDS.EDIT_SHIPPING;
            }
            const validatorMap = pair[1];
            // We have a sub validator map, we need to go on level deeper
            const profileField = profile[mapProfileFieldToKey[field]];
            errors[mapProfileFieldToKey[field]] = {};
            Object.entries(validatorMap).forEach(subPair => {
              // look at sub pairs where subPair[0] is the subField and
              // subPair[1] is the validator
              const [subField, validator] = subPair;
              if (subField === LOCATION_FIELDS.STATE) {
                profileField.errors[subField] = !validator({
                  state: profile[mapProfileFieldToKey[sourceField]][subField],
                  country: profile[mapProfileFieldToKey[sourceField]][LOCATION_FIELDS.COUNTRY],
                });
              } else {
                profileField.errors[subField] = !validator(
                  profile[mapProfileFieldToKey[sourceField]][subField],
                );
              }
              errors[mapProfileFieldToKey[field]][subField] = profileField.errors[subField];
              combinedErrors = combinedErrors || profileField.errors[subField];
            });
            break;
          case PROFILE_FIELDS.EDIT_BILLING_MATCHES_SHIPPING:
          case PROFILE_FIELDS.EDIT_NAME:
            // We have a validator
            const validator = pair[1];
            profile.errors[mapProfileFieldToKey[field]] = !validator(
              profile[mapProfileFieldToKey[field]],
            );
            errors[mapProfileFieldToKey[field]] = profile.errors[mapProfileFieldToKey[field]];
            combinedErrors = combinedErrors || profile.errors[mapProfileFieldToKey[field]];
            break;
          default:
            break;
        }
      });

      // Clear out errors if none exist
      if (combinedErrors === false) {
        delete newAction.errors;
      }

      return next(newAction);
    default:
      break;
  }

  return next(action);
};

export default profileFormValidationMiddleware;
