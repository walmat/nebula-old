import { SETTINGS_ACTIONS, mapSettingsFieldToKey, settingsActions } from '../../actions';
import settingsAttributeValidatorMap from '../../../utils/validation/settingsAttributeValidators';

const settingsFormValidationMiddleware = store => next => action => {
  if (!action.type || action.type !== SETTINGS_ACTIONS.FETCH_SHIPPING) {
    return next(action);
  }

  console.log(action, action.response);

  if (!action.response || (action.response && !action.response.shipping)) {
    return store.dispatch(settingsActions.error(action.type, 'invalid action structure!'));
  }

  // action is gonna be update or add...
  const newAction = JSON.parse(JSON.stringify(action));

  let combinedErrors = false;

  const response = newAction.response.shipping;
  newAction.errors = {};
  const { errors } = response;

  Object.entries(settingsAttributeValidatorMap).forEach(pair => {
    const field = pair[0];
    const validator = pair[1];
    console.log(field, validator, response);

    // if (
    //   response.site &&
    //   !response.site.auth &&
    //   (field === TASK_FIELDS.EDIT_USERNAME || field === TASK_FIELDS.EDIT_PASSWORD)
    // ) {
    //   errors[mapTaskFieldsToKey[field]] = false;
    // } else if (action.type === TASK_ACTIONS.ADD) {
    //   errors[mapTaskFieldsToKey[field]] = !validator(response[mapTaskFieldsToKey[field]]);
    // } else {
    //   errors[mapTaskFieldsToKey[field]] = !validator(response.edits[mapTaskFieldsToKey[field]]);
    // }

    // combinedErrors = combinedErrors || errors[mapTaskFieldsToKey[field]];
  });

  if (combinedErrors === false) {
    delete newAction.errors;
  } else {
    newAction.errors = errors;
  }

  return next(newAction);
};

export default settingsFormValidationMiddleware;
