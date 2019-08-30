import { SETTINGS_ACTIONS, SETTINGS_FIELDS, mapSettingsFieldToKey } from '../../actions';
import settingsAttributeValidatorMap from '../../../utils/validation/settingsAttributeValidators';

const settingsAttributeValidationMiddleware = store => next => action => {
  // Only activate this middleware when the action is editing settings
  if (
    action.type !== SETTINGS_ACTIONS.EDIT ||
    (action.field !== SETTINGS_FIELDS.EDIT_DISCORD &&
      action.field !== SETTINGS_FIELDS.EDIT_SLACK &&
      action.field !== SETTINGS_FIELDS.EDIT_ACCOUNT_NAME &&
      action.field !== SETTINGS_FIELDS.EDIT_ACCOUNT_PASSWORD &&
      action.field !== SETTINGS_FIELDS.EDIT_ACCOUNT_USERNAME)
  ) {
    return next(action);
  }

  // Copy the action object
  const newAction = JSON.parse(JSON.stringify(action));
  // Get the state
  const state = store.getState();

  // Copy over the settings errors map
  newAction.errors = Object.assign({}, state.settings.errors);
  // Validate the field in question
  const error = settingsAttributeValidatorMap[newAction.field](newAction.value);
  newAction.errors[mapSettingsFieldToKey[newAction.field]] = !error;

  // Continue on to next middleware/reducer with errors map filled in
  return next(newAction);
};

export default settingsAttributeValidationMiddleware;
