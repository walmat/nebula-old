import { TASK_ACTIONS, TASK_FIELDS, mapTaskFieldsToKey, taskActions } from '../../actions';
import taskAttributeValidatorMap from '../../validation/taskAttributeValidators';

const tasksAttributeValidationMiddleware = store => next => action => {
  if (action.type !== TASK_ACTIONS.EDIT) {
    return next(action);
  }

  if (
    action.field === TASK_FIELDS.TOGGLE_CAPTCHA ||
    action.field === TASK_FIELDS.TOGGLE_RANDOM_IN_STOCK ||
    action.field === TASK_FIELDS.TOGGLE_ONE_CHECKOUT ||
    action.field === TASK_FIELDS.TOGGLE_RESTOCK_MODE ||
    action.field === TASK_FIELDS.EDIT_TASK_TYPE
  ) {
    return next(action);
  }

  // Check for valid payload structure and dispatch an error if invalid
  if (!action.field || (!action.value && (action.value !== '' && action.value !== null))) {
    return store.dispatch(taskActions.error(action.type, 'invalid action structure!'));
  }

  const newAction = JSON.parse(JSON.stringify(action));

  newAction.errors = {};
  const { errors } = newAction;

  errors[mapTaskFieldsToKey[newAction.field]] = !taskAttributeValidatorMap[newAction.field](
    newAction.value,
    false,
  );
  return next(newAction);
};

export default tasksAttributeValidationMiddleware;
