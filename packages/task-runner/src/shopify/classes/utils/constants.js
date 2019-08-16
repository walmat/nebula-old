const TaskManagerEvents = {
  Abort: 'ABORT',
  StartHarvest: 'START_CAPTCHA_HARVEST',
  StopHarvest: 'STOP_CAPTCHA_HARVEST',
  Harvest: 'CAPTCHA_HARVEST',
  SendProxy: 'SEND_PROXY',
  ChangeDelay: 'CHANGE_DELAY',
  UpdateHook: 'UPDATE_HOOK',
};

/**
 * Task Runner Event Channel Constants
 */
const TaskRunnerEvents = {
  All: 'ALL',
  TaskStatus: 'TASK_STATUS',
  SwapProxy: 'SWAP_PROXY',
  ReceiveProxy: 'RECEIVE_PROXY',
};

const MonitorStates = {
  PARSE: 'PARSE',
  MATCH: 'MATCH',
  CHECK_STOCK: 'CHECK_STOCK',
};

/**
 * Task Runner States
 */
const CheckoutStates = {
  STARTED: 'STARTED',
  LOGIN: 'LOGIN',
  PAYMENT_TOKEN: 'PAYMENT_TOKEN',
  GET_SITE_DATA: 'GET_SITE_DATA',
  MONITOR: 'MONITOR',
  ADD_TO_CART: 'ADD_TO_CART',
  CREATE_CHECKOUT: 'CREATE_CHECKOUT',
  GO_TO_CHECKOUT: 'PING_CHECKOUT',
  QUEUE: 'QUEUE',
  SUBMIT_CUSTOMER: 'SUBMIT_CUSTOMER',
  GO_TO_SHIPPING: 'GO_TO_SHIPPING',
  SUBMIT_SHIPPING: 'SUBMIT_SHIPPING',
  GO_TO_PAYMENT: 'GO_TO_PAYMENT',
  SUBMIT_PAYMENT: 'SUBMIT_PAYMENT',
  COMPLETE_PAYMENT: 'COMPLETE_PAYMENT',
  PROCESS_PAYMENT: 'PROCESS_PAYMENT',
  CAPTCHA: 'CAPTCHA',
  RESTOCK: 'RESTOCK',
  SWAP: 'SWAP',
  DONE: 'DONE',
  ERROR: 'ERROR',
  ABORT: 'ABORT',
  STOP: 'STOP',
};

// Runner Type will be used on frontend, so changing
// these values may break certain things on the
// Frontend!
const TaskRunnerTypes = {
  Normal: 'normal',
  ShippingRates: 'srr',
};

const TaskRunnerDelayTypes = {
  error: 'errorDelay',
  monitor: 'monitorDelay',
};

const TaskRunnerHookTypes = {
  slack: 'slack',
  discord: 'discord',
};

const TaskRunnerCheckoutTypes = {
  fe: 'FRONTEND',
  api: 'API',
};

const Modes = {
  SAFE: 'SAFE',
  FAST: 'FAST',
};

const TaskRunnerHarvestStates = {
  idle: 'IDLE',
  start: 'START',
  suspend: 'SUSPEND',
  stop: 'STOP',
};

/**
 * Error Codes
 */
const ErrorCodes = {
  PasswordPage: 'PASSWORD_PAGE',
  ProductNotFound: 'PRODUCT_MISSING',
  ProductNotLive: 'PRODUCT_NOT_LIVE',
  VariantsNotAvailable: 'VARIANTS_NOT_AVAILABLE',
  VariantsNotMatched: 'VARIANTS_NOT_MATCHED',
  RestockingNotSupported: 'RESTOCK_NOT_SUPPORTED',
};

/**
 * Queue state -> next state
 */
// TODO: Rethink this!!!!
const QueueNextState = {
  [CheckoutStates.ADD_TO_CART]: type => {
    if (type === TaskRunnerCheckoutTypes.fe) {
      return {
        message: 'Submitting information',
        nextState: CheckoutStates.PatchCheckout,
      };
    }
    return {
      message: 'Fetching shipping rates',
      nextState: CheckoutStates.ShippingRates,
    };
  },
  [CheckoutStates.CreateCheckout]: type => {
    if (type === TaskRunnerCheckoutTypes.fe) {
      return {
        message: 'Fetching shipping rates',
        nextState: CheckoutStates.ShippingRates,
      };
    }
    return {
      message: 'Submitting information',
      nextState: CheckoutStates.PatchCheckout,
    };
  },
  [CheckoutStates.PatchCheckout]: () => ({
    message: 'Monitoring for product',
    nextState: CheckoutStates.Monitor,
  }),
};

const CheckoutRefreshTimeout = 900000;

module.exports = {
  TaskManager: {
    Events: TaskManagerEvents,
  },
  TaskRunner: {
    Types: TaskRunnerTypes,
    Modes,
    Events: TaskRunnerEvents,
    States: CheckoutStates,
    StateMap: QueueNextState,
    CheckoutTypes: TaskRunnerCheckoutTypes,
    CheckoutRefresh: CheckoutRefreshTimeout,
    DelayTypes: TaskRunnerDelayTypes,
    HookTypes: TaskRunnerHookTypes,
    HarvestStates: TaskRunnerHarvestStates,
  },
  Monitor: {
    States: MonitorStates,
  },
  ErrorCodes,
};
