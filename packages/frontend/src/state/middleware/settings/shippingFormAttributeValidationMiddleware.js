import { SETTINGS_ACTIONS, SETTINGS_FIELDS, mapSettingsFieldToKey } from '../../actions';
import shippingFormAttributeValidatorMap from '../../../utils/validation/shippingFormAttributeValidators';

const shippingFormAttributeValidationMiddleware = store => next => action => {
  // Only activate this middleware when the action is editing shipping
  if (
    action.type !== SETTINGS_ACTIONS.EDIT ||
    (action.field !== SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT &&
      action.field !== SETTINGS_FIELDS.EDIT_SHIPPING_RATE_NAME &&
      action.field !== SETTINGS_FIELDS.EDIT_SHIPPING_PROFILE &&
      action.field !== SETTINGS_FIELDS.EDIT_SHIPPING_SITE &&
      action.field !== SETTINGS_FIELDS.EDIT_SHIPPING_USERNAME &&
      action.field !== SETTINGS_FIELDS.EDIT_SHIPPING_PASSWORD)
  ) {
    return next(action);
  }

  // Copy the action object
  const newAction = JSON.parse(JSON.stringify(action));
  // Get the state
  const state = store.getState();

  // Copy over the settings errors map
  newAction.errors = Object.assign({}, state.settings.shipping.errors);
  // Validate the field in question
  const error = shippingFormAttributeValidatorMap[newAction.field](newAction.value);
  newAction.errors[mapSettingsFieldToKey[newAction.field]] = !error;

  // Continue on to next middleware/reducer with errors map filled in
  return next(newAction);
};

export default shippingFormAttributeValidationMiddleware;
