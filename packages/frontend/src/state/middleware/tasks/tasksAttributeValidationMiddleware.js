import { TASK_ACTIONS, mapTaskFieldsToKey, taskActions } from '../../actions';
import taskAttributeValidatorMap from '../../../utils/validation/taskAttributeValidators';

const tasksAttributeValidationMiddleware = store => next => action => {
  if (action.type !== TASK_ACTIONS.EDIT) {
    return next(action);
  }

  // Check for valid payload structure and dispatch an error if invalid
  if (!action.field || (!action.value && action.value !== '')) {
    return store.dispatch(
      taskActions.error(action.type, 'invalid action structure!')
    );
  }

  const newAction = JSON.parse(JSON.stringify(action));

  newAction.errors = {};
  const { errors } = newAction;

  errors[mapTaskFieldsToKey[newAction.field]] = !taskAttributeValidatorMap[
    newAction.field
  ](newAction.value);
  return next(newAction);
};

export default tasksAttributeValidationMiddleware;
