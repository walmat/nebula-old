import { SETTINGS_ACTIONS, mapSettingsFieldToKey } from '../../actions';
import settingsAttributeValidatorMap from '../../../utils/validation/settingsProxyAttributeValidators';

const settingsAttributeValidationMiddleware = store => next => action => {
  // Only activate this middleware when the action is editing settings
  if (action.type !== SETTINGS_ACTIONS.EDIT) {
    return next(action);
  }

  // Copy the action object
  const newAction = JSON.parse(JSON.stringify(action));

  // Validate the field in question
  if (newAction.field === 'EDIT_PROXIES') {
    // Get the state
    const state = store.getState();

    // Copy over the settings errors map
    newAction.errors = Object.assign({}, state.settings.errors);

    // TODO - remove this later when validation is finalized
    const proxyErrors = settingsAttributeValidatorMap[newAction.field](
      newAction.value
    );
    newAction.errors[mapSettingsFieldToKey[newAction.field]] = proxyErrors;

    if (!proxyErrors.length) {
      delete newAction.errors[mapSettingsFieldToKey[newAction.field]];
    }
  }

  // Continue on to next middleware/reducer with errors map filled in
  return next(newAction);
};

export default settingsAttributeValidationMiddleware;
