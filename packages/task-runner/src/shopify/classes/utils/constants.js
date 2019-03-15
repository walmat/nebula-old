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

/**
 * Task Runner States
 */
const TaskRunnerStates = {
  Started: 'STARTED',
  Login: 'LOGIN',
  PaymentToken: 'PAYMENT_TOKEN',
  CreateCheckout: 'CREATE_CHECKOUT',
  GetCheckout: 'GET_CHECKOUT',
  PingCheckout: 'PING_CHECKOUT',
  PollQueue: 'POLL_QUEUE',
  PatchCheckout: 'PATCH_CHECKOUT',
  Monitor: 'MONITOR',
  Restocking: 'RESTOCKING',
  AddToCart: 'ADD_TO_CART',
  ShippingRates: 'SHIPPING_RATES',
  RequestCaptcha: 'REQUEST_CAPTCHA',
  PostPayment: 'POST_PAYMENT',
  CompletePayment: 'COMPLETE_PAYMENT',
  PaymentProcess: 'PAYMENT_PROCESS',
  SwapProxies: 'SWAP_PROXIES',
  Finished: 'FINISHED',
  Errored: 'ERRORED',
  Aborted: 'ABORTED',
  Stopped: 'STOPPED',
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
  ProductNotFound: 'PRODUCT_MISSING',
  ProductNotLive: 'PRODUCT_NOT_LIVE',
  VariantsNotAvailable: 'VARIANTS_NOT_AVAILABLE',
  VariantsNotMatched: 'VARIANTS_NOT_MATCHED',
  RestockingNotSupported: 'RESTOCK_NOT_SUPPORTED',
};

/**
 * Queue state -> next state
 */
const PollQueueStateToNextState = {
  [TaskRunnerStates.AddToCart]: type => {
    if (type === TaskRunnerCheckoutTypes.fe) {
      return {
        message: 'Submitting information',
        nextState: TaskRunnerStates.PatchCheckout,
      };
    }
    return {
      message: 'Fetching shipping rates',
      nextState: TaskRunnerStates.ShippingRates,
    };
  },
  [TaskRunnerStates.CreateCheckout]: type => {
    if (type === TaskRunnerCheckoutTypes.fe) {
      return {
        message: 'Fetching shipping rates',
        nextState: TaskRunnerStates.ShippingRates,
      };
    }
    return {
      message: 'Submitting information',
      nextState: TaskRunnerStates.PatchCheckout,
    };
  },
  [TaskRunnerStates.PatchCheckout]: () => ({
    message: 'Monitoring for product',
    nextState: TaskRunnerStates.Monitor,
  }),
};

const CheckoutRefreshTimeout = 420000;

module.exports = {
  TaskManager: {
    Events: TaskManagerEvents,
  },
  TaskRunner: {
    Events: TaskRunnerEvents,
    States: TaskRunnerStates,
    StateMap: PollQueueStateToNextState,
    CheckoutTypes: TaskRunnerCheckoutTypes,
    CheckoutRefresh: CheckoutRefreshTimeout,
    DelayTypes: TaskRunnerDelayTypes,
    HookTypes: TaskRunnerHookTypes,
    HarvestStates: TaskRunnerHarvestStates,
  },
  ErrorCodes,
};
