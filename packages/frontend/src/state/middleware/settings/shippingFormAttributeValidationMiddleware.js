import { SETTINGS_ACTIONS, SETTINGS_FIELDS, mapSettingsFieldToKey } from '../../actions';
import shippingFormAttributeValidatorMap from '../../validation/shippingFormAttributeValidators';

const shippingFormAttributeValidationMiddleware = store => next => action => {
  // Only activate this middleware when the action is editing shipping
  const validField = [
    SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT,
    SETTINGS_FIELDS.EDIT_SHIPPING_RATE_NAME,
    SETTINGS_FIELDS.EDIT_SHIPPING_PROFILE,
    SETTINGS_FIELDS.EDIT_SHIPPING_SITE,
    SETTINGS_FIELDS.EDIT_SHIPPING_USERNAME,
    SETTINGS_FIELDS.EDIT_SHIPPING_PASSWORD,
  ].includes(action.field);

  if (action.type !== SETTINGS_ACTIONS.EDIT || !validField) {
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
