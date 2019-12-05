import { Constants } from '../../common';

const { Task: TaskConstants, Monitor: MonitorConstants } = Constants;

const MonitorStates = {
  ...MonitorConstants.States,
  // ... todo!
};

/**
 * Task Runner States
 */
const CheckoutStates = {
  ...TaskConstants.States,
  // ... todo!
};

const Task = {
  States: CheckoutStates,
};

const Monitor = {
  States: MonitorStates,
};

export { Task, Monitor };
