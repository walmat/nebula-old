import {
  SETTINGS_ACTIONS,
  SETTINGS_FIELDS,
  mapSettingsFieldToKey,
  settingsActions,
} from '../../actions';
import shippingFormAttributeValidatorMap from '../../../utils/validation/shippingFormAttributeValidators';

const shippingFormValidationMiddleware = store => next => action => {
  if (!action.type || action.type !== SETTINGS_ACTIONS.FETCH_SHIPPING) {
    return next(action);
  }

  if (!action.response || (action.response && !action.response.shipping)) {
    return store.dispatch(settingsActions.error(action.type, 'invalid action structure!'));
  }

  // action is gonna be update or add...
  const newAction = JSON.parse(JSON.stringify(action));

  let combinedErrors = false;

  const response = newAction.response.shipping;
  newAction.errors = {};

  Object.entries(shippingFormAttributeValidatorMap).forEach(pair => {
    const field = pair[0];
    const validator = pair[1];

    if (
      response.site &&
      !response.site.auth &&
      (field === SETTINGS_FIELDS.EDIT_SHIPPING_USERNAME ||
        field === SETTINGS_FIELDS.EDIT_SHIPPING_PASSWORD)
    ) {
      newAction.errors[mapSettingsFieldToKey[field]] = false;
    } else {
      newAction.errors[mapSettingsFieldToKey[field]] = !validator(
        response[mapSettingsFieldToKey[field]],
      );
    }

    combinedErrors = combinedErrors || newAction.errors[mapSettingsFieldToKey[field]];
  });

  if (combinedErrors === false) {
    delete newAction.errors;
  }

  return next(newAction);
};

export default shippingFormValidationMiddleware;
