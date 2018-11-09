import {
  TASK_ACTIONS,
  taskActions,
  mapTaskFieldsToKey,
} from '../../actions';
import taskAttributeValidatorMap from '../../../utils/validation/taskAttributeValidators';

const taskValidationMiddleware = store => next => (action) => {
  switch (action.type) {
    case TASK_ACTIONS.ADD:
    case TASK_ACTIONS.UPDATE:
      if (!action.response.task) {
        return store.dispatch(taskActions.error(action.type, 'invalid action structure!'));
      }

      const newAction = JSON.parse(JSON.stringify(action));
      newAction.task = JSON.parse(JSON.stringify(action.response.task));
      newAction.errors = {};
      const { errors, task } = newAction;

      Object.entries(taskAttributeValidatorMap).forEach((pair) => {
        const field = pair[0];
        const validator = pair[1];
        errors[mapTaskFieldsToKey[field]] = !validator(task[mapTaskFieldsToKey[field]]);
      });
      break;
    default:
      break;
  }
};

export default taskValidationMiddleware;
