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

const Modes = {
  SAFE: 'SAFE',
  FAST: 'FAST',
  UNKNOWN: 'UNKNOWN',
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
};

/**
 * Queue state -> next state
 */
const QueueNextState = {
  [CheckoutStates.ADD_TO_CART]: (type, task, shippingMethod) => {
    if (type === Modes.FAST) {
      return {
        message: 'Going to checkout',
        nextState: CheckoutStates.GO_TO_CHECKOUT,
      };
    }

    if (type === Modes.SAFE && /dsm sg|dsm jp|dsm uk/i.test(task.site.name)) {
      if (shippingMethod && shippingMethod.id) {
        return {
          message: 'Submitting payment',
          nextState: CheckoutStates.SUBMIT_PAYMENT,
        };
      }
      return {
        message: 'Fetching shipping rates',
        nextState: CheckoutStates.GO_TO_SHIPPING,
      };
    }

    return {
      message: 'Go to checkout',
      nextState: CheckoutStates.CREATE_CHECKOUT,
    };
  },
  [CheckoutStates.CREATE_CHECKOUT]: (type, task) => {
    if (type === Modes.FAST) {
      return {
        message: 'Submitting information',
        nextState: CheckoutStates.SUBMIT_CUSTOMER,
      };
    }

    if (/dsm sg|dsm jp|dsm uk/i.test(task.site.name) && type === Modes.SAFE) {
      return {
        message: 'Submitting information',
        nextState: CheckoutStates.SUBMIT_CUSTOMER,
      };
    }

    if (!/eflash|palace/i.test(task.site.url)) {
      return {
        message: 'Waiting for product',
        nextState: CheckoutStates.WAIT_FOR_PRODUCT,
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
  [CheckoutStates.SUBMIT_CUSTOMER]: (type, task) => {
    if (type === Modes.FAST) {
      return {
        message: 'Monitoring for product',
        nextState: CheckoutStates.MONITOR,
      };
    }

    if (/dsm sg|dsm jp|dsm uk/i.test(task.site.name)) {
      return {
        message: 'Waiting for product',
        nextState: CheckoutStates.WAIT_FOR_PRODUCT,
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

const CheckoutRefreshTimeout = 98000;

module.exports = {
  TaskRunner: {
    Types: TaskRunnerTypes,
    Modes,
    States: CheckoutStates,
    StateMap: QueueNextState,
    CheckoutRefresh: CheckoutRefreshTimeout,
    DelayTypes: TaskRunnerDelayTypes,
    HookTypes: TaskRunnerHookTypes,
    HarvestStates: TaskRunnerHarvestStates,
  },
  Monitor: {
    States: MonitorStates,
    DelayTypes: TaskRunnerDelayTypes,
    ParseType,
  },
  ErrorCodes,
};
