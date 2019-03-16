import { SETTINGS_ACTIONS, SETTINGS_FIELDS, mapSettingsFieldToKey } from '../../actions';
import proxyAttributeValidatorMap from '../../../utils/validation/proxyAttributeValidators';

const proxyAttributeValidationMiddleware = store => next => action => {
  // Only activate this middleware when the action is editing settings
  if (action.type !== SETTINGS_ACTIONS.EDIT || action.field !== SETTINGS_FIELDS.EDIT_PROXIES) {
    return next(action);
  }

  // Copy the action object
  const newAction = JSON.parse(JSON.stringify(action));
  // Get the state
  const state = store.getState();

  // Copy over the settings errors map
  newAction.errors = Object.assign({}, state.settings.errors);
  // Validate the field in question
  const error = proxyAttributeValidatorMap[newAction.field](newAction.value);
  newAction.errors[mapSettingsFieldToKey[newAction.field]] = error;
  if (!error.length) {
    delete newAction.errors[mapSettingsFieldToKey[newAction.field]];
  }
  // Continue on to next middleware/reducer with errors map filled in
  return next(newAction);
};

export default proxyAttributeValidationMiddleware;
