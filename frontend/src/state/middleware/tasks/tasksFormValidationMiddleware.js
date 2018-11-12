import {
  TASK_ACTIONS,
  mapTaskFieldsToKey,
  taskActions,
} from '../../actions';
import taskAttributeValidatorMap from '../../../utils/validation/taskAttributeValidators';

const tasksFormValidationMiddleware = store => next => (action) => {
  if (!action.type ||
      (action.type !== TASK_ACTIONS.ADD && action.type !== TASK_ACTIONS.UPDATE)) {
    return next(action);
  }

  if (!action.response || (action.response && !action.response.task)) {
    return store.dispatch(taskActions.error(action.type, 'invalid action structure!'));
  }

  // action is gonna be update or add...
  const newAction = JSON.parse(JSON.stringify(action));

  let combinedErrors = false;
  const response =
    action.type === TASK_ACTIONS.ADD ? newAction.response.task :
      newAction.response.task;
  newAction.errors = {};
  const errors = action.type === TASK_ACTIONS.ADD ? newAction.response.task.errors :
    newAction.response.task.edits.errors;

  Object.entries(taskAttributeValidatorMap).forEach((pair) => {
    const field = pair[0];
    const validator = pair[1];

    if (response.site && !response.site.auth && (field === 'EDIT_USERNAME' || field === 'EDIT_PASSWORD')) {
      errors[mapTaskFieldsToKey[field]] = false;
    } else {
      errors[mapTaskFieldsToKey[field]] = !validator(response[mapTaskFieldsToKey[field]]);
    }
    combinedErrors = combinedErrors || errors[mapTaskFieldsToKey[field]];
  });

  if (combinedErrors === false) {
    delete newAction.errors;
  }
  return next(newAction);
};

export default tasksFormValidationMiddleware;
