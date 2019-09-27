import { TASK_ACTIONS, mapTaskFieldsToKey, taskActions } from '../../actions';
import taskAttributeValidatorMap from '../../../utils/validation/taskAttributeValidators';
import { TASK_FIELDS } from '../../actions/tasks/taskActions';
import PLATFORMS from '../../../constants/platforms';

const tasksFormValidationMiddleware = store => next => action => {
  if (!action.type || (action.type !== TASK_ACTIONS.ADD && action.type !== TASK_ACTIONS.UPDATE)) {
    return next(action);
  }

  if (!action.response || (action.response && !action.response.task)) {
    return store.dispatch(taskActions.error(action.type, 'invalid action structure!'));
  }

  // action is gonna be update or add...
  const newAction = JSON.parse(JSON.stringify(action));
  let combinedErrors = false;

  const response = newAction.response.task;
  const { platform } = response;
  newAction.errors = {};
  const { errors } = action.type === TASK_ACTIONS.ADD ? response : response.edits;
  switch (platform) {
    case PLATFORMS.Shopify: {
      Object.entries(taskAttributeValidatorMap).forEach(pair => {
        const field = pair[0];
        const validator = pair[1];

        if (
          field === TASK_FIELDS.EDIT_PRODUCT_VARIATION ||
          field === TASK_FIELDS.EDIT_TASK_CATEGORY ||
          field === TASK_FIELDS.EDIT_TASK_ACCOUNT
        ) {
          errors[mapTaskFieldsToKey[field]] = false;
        } else if (action.type === TASK_ACTIONS.ADD) {
          errors[mapTaskFieldsToKey[field]] = !validator(response[mapTaskFieldsToKey[field]]);
        } else if (field === TASK_FIELDS.EDIT_AMOUNT) {
          errors[mapTaskFieldsToKey[field]] = false;
        } else {
          errors[mapTaskFieldsToKey[field]] = !validator(response.edits[mapTaskFieldsToKey[field]]);
        }

        combinedErrors = combinedErrors || errors[mapTaskFieldsToKey[field]];
      });
      break;
    }
    case PLATFORMS.Supreme: {
      Object.entries(taskAttributeValidatorMap).forEach(pair => {
        const field = pair[0];
        const validator = pair[1];

        if (field === TASK_FIELDS.EDIT_PRODUCT_VARIATION) {
          errors[mapTaskFieldsToKey[field]] = !validator(
            response.product[mapTaskFieldsToKey[field]],
          );
        } else if (field === TASK_FIELDS.EDIT_TASK_ACCOUNT) {
          errors[mapTaskFieldsToKey[field]] = false;
        } else if (action.type === TASK_ACTIONS.ADD) {
          errors[mapTaskFieldsToKey[field]] = !validator(response[mapTaskFieldsToKey[field]]);
        } else {
          errors[mapTaskFieldsToKey[field]] = !validator(response.edits[mapTaskFieldsToKey[field]]);
        }

        combinedErrors = combinedErrors || errors[mapTaskFieldsToKey[field]];
      });
      break;
    }
    default: {
      break;
    }
  }

  if (!combinedErrors) {
    delete newAction.errors;
  } else {
    newAction.errors = errors;
  }

  return next(newAction);
};

export default tasksFormValidationMiddleware;
