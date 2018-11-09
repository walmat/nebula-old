import {
  TASK_ACTIONS,
  mapTaskFieldsToKey,
} from '../../actions';
import taskAttributeValidatorMap from '../../../utils/validation/taskAttributeValidators';

const tasksAttributeValidationMiddleware = () => next => (action) => {
  if (action.type !== TASK_ACTIONS.EDIT) {
    return next(action);
  }
  const newAction = JSON.parse(JSON.stringify(action));

  newAction.errors = {};
  const { errors } = newAction;

  errors[mapTaskFieldsToKey[newAction.field]] =
    !taskAttributeValidatorMap[newAction.field](newAction.value);
  return next(newAction);
};

export default tasksAttributeValidationMiddleware;
