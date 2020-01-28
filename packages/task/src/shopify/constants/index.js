import { Constants } from '../../common';

const { Task: TaskConstants, Monitor: MonitorConstants } = Constants;

const MonitorStates = {
  ...MonitorConstants.States,
  PARSE: 'PARSE',
  MATCH: 'MATCH',
};

/**
 * Task Runner States
 */
const CheckoutStates = {
  ...TaskConstants.States,
  LOGIN: 'LOGIN',
  PAYMENT_SESSION: 'PAYMENT_SESSION',
  GATHER_DATA: 'GATHER_DATA',
  ADD_TO_CART: 'ADD_TO_CART',
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
  SUBMIT_CHECKOUT: 'SUBMIT_CHECKOUT',
  GO_TO_REVIEW: 'GO_TO_REVIEW',
  COMPLETE_CHECKOUT: 'COMPLETE_CHECKOUT',
  CHECK_ORDER: 'CHECK_ORDER',
};

const Modes = {
  FAST: 'FAST',
  SAFE: 'SAFE',
  DYNO: 'DYNO',
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

    if (type === Modes.SAFE && /dsm sg|dsm jp|dsm uk/i.test(task.store.name)) {
      if (shippingMethod && shippingMethod.id) {
        return {
          message: 'Submitting checkout',
          nextState: CheckoutStates.SUBMIT_CHECKOUT,
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
    if (type === Modes.FAST || /dsm sg|dsm jp|dsm uk/i.test(task.store.name)) {
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
          nextState: CheckoutStates.PAYMENT_SESSION,
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
    if (type === Modes.FAST || /dsm sg|dsm jp|dsm uk/i.test(task.store.name)) {
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
        message: 'Submitting checkout',
        nextState: CheckoutStates.SUBMIT_CHECKOUT,
      };
    }
    return {
      message: 'Submitting checkout',
      nextState: CheckoutStates.GO_TO_PAYMENT,
    };
  },
  [CheckoutStates.SUBMIT_CHECKOUT]: type => {
    if (type === Modes.FAST) {
      return {
        message: 'Completing payment',
        nextState: CheckoutStates.COMPLETE_CHECKOUT,
      };
    }
    return {
      message: 'Submitting checkout',
      nextState: CheckoutStates.GO_TO_PAYMENT,
    };
  },
  [CheckoutStates.COMPLETE_CHECKOUT]: type => {
    if (type === Modes.FAST) {
      return {
        message: 'Submitting checkout',
        nextState: CheckoutStates.COMPLETE_CHECKOUT,
      };
    }
    return {
      message: 'Submitting checkout',
      nextState: CheckoutStates.GO_TO_PAYMENT,
    };
  },
};

const Task = {
  Modes,
  States: CheckoutStates,
  StateMap: QueueNextState,
};

const Monitor = {
  States: MonitorStates,
};

export { Task, Monitor };
