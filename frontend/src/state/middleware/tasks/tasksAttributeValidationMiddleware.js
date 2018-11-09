import {
  TASK_ACTIONS,
  TASK_FIELDS,
  taskActions,
  mapTaskFieldsToKey,
} from '../../actions';
import taskAttributeValidatorMap from '../../../utils/validation/taskAttributeValidators';

const taskAttributeValidationMiddleware = store => next => (action) => {
  if (action.type !== TASK_ACTIONS.EDIT) {
    return next(action);
  }

  const state = store.getState();
};
