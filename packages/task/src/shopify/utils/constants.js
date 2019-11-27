const MonitorStates = {
  PARSE: 'PARSE',
  MATCH: 'MATCH',
  RESTOCK: 'RESTOCK',
  SWAP: 'SWAP',
  DONE: 'DONE',
  ERROR: 'ERROR',
  ABORT: 'ABORT',
};

/**
 * Task Runner States
 */
const CheckoutStates = {
  STARTED: 'STARTED',
  LOGIN: 'LOGIN',
  WAIT_FOR_LOGIN: 'WAIT_FOR_LOGIN',
  PAYMENT_TOKEN: 'PAYMENT_TOKEN',
  GET_SITE_DATA: 'GET_SITE_DATA',
  WAIT_FOR_PRODUCT: 'WAIT_FOR_PRODUCT',
  ADD_TO_CART: 'ADD_TO_CART',
  CLEAR_CART: 'CLEAR_CART',
  GO_TO_CART: 'GO_TO_CART',
  GO_TO_CHECKPOINT: 'GO_TO_CHECKPOINT',
  SUBMIT_CHECKPOINT: 'SUBMIT_CHECKPOINT',
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
  BACKUP_PROCESS_PAYMENT: 'BACKUP_PROCESS_PAYMENT',
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
const TaskTypes = {
  Normal: 'normal',
  ShippingRates: 'srr',
};

const Modes = {
  SAFE: 'SAFE',
  FAST: 'FAST',
  CART: 'CART',
  UNKNOWN: 'UNKNOWN',
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
      message: 'Going to cart',
      nextState: CheckoutStates.GO_TO_CART,
    };
  },
  // should only be called in safe mode!
  [CheckoutStates.GO_TO_CART]: () => ({
    message: 'Creating checkout',
    nextState: CheckoutStates.CREATE_CHECKOUT,
  }),
  [CheckoutStates.CREATE_CHECKOUT]: (type, task) => {
    if (type === Modes.FAST || /dsm sg|dsm jp|dsm uk/i.test(task.site.name)) {
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
  [CheckoutStates.GO_TO_CHECKOUT]: (type, task, shippingMethod) => {
    if (type === Modes.FAST) {
      if (shippingMethod && shippingMethod.id) {
        if (task.forceCaptcha) {
          return {
            message: 'Waiting for captcha',
            nextState: CheckoutStates.CAPTCHA,
          };
        }
        return {
          message: 'Submitting pament',
          nextState: CheckoutStates.PAYMENT_TOKEN,
        };
      }
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
    if (type === Modes.FAST || /dsm sg|dsm jp|dsm uk/i.test(task.site.name)) {
      if (!task.product.variants) {
        return {
          message: 'Waiting for product',
          nextState: CheckoutStates.WAIT_FOR_PRODUCT,
        };
      }
      return {
        message: 'Adding to cart',
        nextState: CheckoutStates.ADD_TO_CART,
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

const CheckoutRefreshTimeout = 98000;

const Task = {
  Types: TaskTypes,
  Modes,
  States: CheckoutStates,
  StateMap: QueueNextState,
  CheckoutRefresh: CheckoutRefreshTimeout,
};

const Monitor = {
  States: MonitorStates,
};

export { Task, Monitor };
