const TaskManagerEvents = {
  Abort: 'ABORT',
  StartHarvest: 'START_CAPTCHA_HARVEST',
  StopHarvest: 'STOP_CAPTCHA_HARVEST',
  Harvest: 'CAPTCHA_HARVEST',
  SendProxy: 'SEND_PROXY',
  ChangeDelay: 'CHANGE_DELAY',
  UpdateHook: 'UPDATE_HOOK',
  ProductFound: 'PRODUCT_FOUND',
};

/**
 * Task Runner Event Channel Constants
 */
const TaskRunnerEvents = {
  All: 'ALL',
  TaskStatus: 'TASK_STATUS',
  MonitorStatus: 'MONITOR_STATUS',
  SwapProxy: 'SWAP_PROXY',
  ReceiveProxy: 'RECEIVE_PROXY',
};

const MonitorStates = {
  PARSE: 'PARSE',
  MATCH: 'MATCH',
  RESTOCK: 'RESTOCK',
  SWAP: 'SWAP',
  DONE: 'DONE',
  ERROR: 'ERROR',
  ABORT: 'ABORT',
  STOP: 'STOP',
};

/**
 * Task Runner States
 */
const CheckoutStates = {
  STARTED: 'STARTED',
  LOGIN: 'LOGIN',
  PAYMENT_TOKEN: 'PAYMENT_TOKEN',
  GET_SITE_DATA: 'GET_SITE_DATA',
  WAIT_FOR_PRODUCT: 'WAIT_FOR_PRODUCT',
  ADD_TO_CART: 'ADD_TO_CART',
  GO_TO_CART: 'GO_TO_CART',
  CREATE_CHECKOUT: 'CREATE_CHECKOUT',
  GO_TO_CHECKOUT: 'GO_TO_CHECKOUT',
  QUEUE: 'QUEUE',
  SUBMIT_CUSTOMER: 'SUBMIT_CUSTOMER',
  GO_TO_SHIPPING: 'GO_TO_SHIPPING',
  SUBMIT_SHIPPING: 'SUBMIT_SHIPPING',
  GO_TO_PAYMENT: 'GO_TO_PAYMENT',
  SUBMIT_PAYMENT: 'SUBMIT_PAYMENT',
  GO_TO_REVIEW: 'GO_TO_REVIEW',
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
const QueueNextState = {
  [CheckoutStates.ADD_TO_CART]: type => {
    if (type === Modes.FAST) {
      return {
        message: 'Going to checkout',
        nextState: CheckoutStates.GO_TO_CHECKOUT,
      };
    }
    return {
      message: 'Go to checkout',
      nextState: CheckoutStates.CREATE_CHECKOUT,
    };
  },
  [CheckoutStates.CREATE_CHECKOUT]: type => {
    if (type === Modes.FAST) {
      return {
        message: 'Submitting information',
        nextState: CheckoutStates.SUBMIT_CUSTOMER,
      };
    }
    return {
      message: 'Going to checkout',
      nextState: CheckoutStates.GO_TO_CHECKOUT,
    };
  },
  [CheckoutStates.GO_TO_CHECKOUT]: type => {
    if (type === Modes.FAST) {
      return {
        message: 'Fetching shipping rates',
        nextState: CheckoutStates.SUBMIT_CUSTOMER,
      };
    }
    return {
      message: 'Going to checkout',
      nextState: CheckoutStates.GO_TO_CHECKOUT,
    };
  },
  [CheckoutStates.SUBMIT_CUSTOMER]: type => {
    if (type === Modes.FAST) {
      return {
        message: 'Monitoring for product',
        nextState: CheckoutStates.MONITOR,
      };
    }
    return {
      message: 'Fetching shipping rates',
      nextState: CheckoutStates.GO_TO_SHIPPING,
    };
  },
  [CheckoutStates.SUBMIT_SHIPPING]: type => {
    if (type === Modes.FAST) {
      return {
        message: 'Submitting payment',
        nextState: CheckoutStates.SUBMIT_PAYMENT,
      };
    }
    return {
      message: 'Submitting payment',
      nextState: CheckoutStates.GO_TO_PAYMENT,
    };
  },
  [CheckoutStates.SUBMIT_PAYMENT]: type => {
    if (type === Modes.FAST) {
      return {
        message: 'Completing payment',
        nextState: CheckoutStates.COMPLETE_PAYMENT,
      };
    }
    return {
      message: 'Submitting payment',
      nextState: CheckoutStates.GO_TO_PAYMENT,
    };
  },
  [CheckoutStates.COMPLETE_PAYMENT]: type => {
    if (type === Modes.FAST) {
      return {
        message: 'Submitting payment',
        nextState: CheckoutStates.COMPLETE_PAYMENT,
      };
    }
    return {
      message: 'Submitting payment',
      nextState: CheckoutStates.GO_TO_PAYMENT,
    };
  },
};

const ParseType = {
  Unknown: 'UNKNOWN',
  Variant: 'VARIANT',
  Url: 'URL',
  Keywords: 'KEYWORDS',
  Special: 'SPECIAL',
};

// const CheckoutRefreshTimeout = 900000;
const CheckoutRefreshTimeout = 98000;

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
    Events: TaskRunnerEvents,
    DelayTypes: TaskRunnerDelayTypes,
    ParseType,
  },
  ErrorCodes,
};
