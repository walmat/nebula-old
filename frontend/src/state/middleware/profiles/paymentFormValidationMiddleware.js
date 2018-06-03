import { PROFILE_ACTIONS, PROFILE_FIELDS } from '../../Actions';
import paymentAttributeValidators from '../../../utils/validation/paymentAttributeValidators';

const paymentFormValidationMiddleware = store => next => action => {
  // Only activate this middleware when the action is editing the payment field of a profile...
  if(action.type !== PROFILE_ACTIONS.EDIT || action.field !== PROFILE_FIELDS.EDIT_PAYMENT) {
    return next(action);
  }

  // Get the state and set the errors map
  const state = store.getState();
  action.errors = Object.assign({}, state.currentProfile.payment.errors);

  // Call the correct validator to fill in the new error state.
  action.errors[action.subField] = !paymentAttributeValidators[action.subField](action.value);

  // Continue on to next middleware/reducer with errors map filled in.
  return next(action);
};

export default paymentFormValidationMiddleware;
