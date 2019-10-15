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

const TaskRunnerDelayTypes = {
  checkout: 'checkoutDelay',
  error: 'errorDelay',
  monitor: 'monitorDelay',
};

const TaskRunnerHookTypes = {
  slack: 'slack',
  discord: 'discord',
};

const TaskRunnerHarvestStates = {
  idle: 'IDLE',
  start: 'START',
  suspend: 'SUSPEND',
  stop: 'STOP',
};

const ParseType = {
  Unknown: 'UNKNOWN',
  Variant: 'VARIANT',
  Url: 'URL',
  Keywords: 'KEYWORDS',
};

const ErrorCodes = {
  NoStylesFound: 'NO_STYLES_FOUND',
  VariantNotFound: 'VARIANT_NOT_FOUND',
  ProductNotFound: 'PRODUCT_NOT_FOUND',
};

const TaskRunner = {
  States: CheckoutStates,
  Types: { Normal: 'normal' },
  DelayTypes: TaskRunnerDelayTypes,
  HookTypes: TaskRunnerHookTypes,
  HarvestStates: TaskRunnerHarvestStates,
};

const Monitor = {
  States: MonitorStates,
  DelayTypes: TaskRunnerDelayTypes,
  ParseType,
  ErrorCodes,
};

export { TaskRunner, Monitor };
