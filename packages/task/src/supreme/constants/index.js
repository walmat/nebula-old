import { Constants } from '../../common';

const { Task: TaskConstants, Monitor: MonitorConstants } = Constants;

const MonitorStates = {
  ...MonitorConstants.States,
  PARSE: 'PARSE',
  STOCK: 'STOCK',
};

const CheckoutStates = {
  ...TaskConstants.States,
  ADD_TO_CART: 'ADD_TO_CART',
  SUBMIT_CHECKOUT: 'SUBMIT_CHECKOUT',
  CHECK_ORDER: 'CHECK_ORDER',
};

const Regions = {
  US: 'US',
  EU: 'EU',
  JP: 'JP',
};

const Task = {
  States: CheckoutStates,
};

const Monitor = {
  States: MonitorStates,
};

export { Task, Monitor, Regions };
