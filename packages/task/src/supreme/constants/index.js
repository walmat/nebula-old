const MonitorStates = {
  PARSE: 'PARSE',
  STOCK: 'STOCK',
  DONE: 'DONE',
  ERROR: 'ERROR',
  SWAP: 'SWAP',
  ABORT: 'ABORT',
};

const CheckoutStates = {
  STARTED: 'STARTED',
  WAIT_FOR_PRODUCT: 'WAIT_FOR_PRODUCT',
  ADD_TO_CART: 'ADD_TO_CART',
  SUBMIT_CHECKOUT: 'SUBMIT_CHECKOUT',
  CHECK_STATUS: 'CHECK_STATUS',
  CAPTCHA: 'CAPTCHA',
  SWAP: 'SWAP',
  DONE: 'DONE',
  ERROR: 'ERROR',
  ABORT: 'ABORT',
  STOP: 'STOP',
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
