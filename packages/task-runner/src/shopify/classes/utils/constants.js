const TaskManagerEvents = {
  StartHarvest: 'START_CAPTCHA_HARVEST',
  StopHarvest: 'STOP_CAPTCHA_HARVEST',
  Harvest: 'CAPTCHA_HARVEST',
  SendProxy: 'SEND_PROXY',
  ChangeDelay: 'CHANGE_DELAY',
};

/**
 * Task Runner Event Channel Constants
 */
const TaskRunnerEvents = {
  All: 'ALL',
  TaskStatus: 'TASK_STATUS',
  MonitorStatus: 'MONITOR_STATUS',
  CheckoutStatus: 'CHECKOUT_STATUS',
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
  PollQueue: 'POLL_QUEUE',
  PatchCheckout: 'PATCH_CHECKOUT',
  Monitor: 'MONITOR',
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

/**
 * Parser Error Codes
 */
const ParserErrorCodes = {
  ProductNotFound: 'PRODUCT_MISSING',
};

/**
 * Queue state -> next state
 */
const PollQueueStateToNextState = {
  [TaskRunnerStates.AddToCart]: {
    message: 'Submitting information',
    nextState: TaskRunnerStates.PatchCheckout,
  },
  [TaskRunnerStates.CreateCheckout]: {
    message: 'Submitting information',
    nextState: TaskRunnerStates.PatchCheckout,
  },
  [TaskRunnerStates.PatchCheckout]: {
    message: 'Monitoring for product',
    nextState: TaskRunnerStates.Monitor,
  },
};

module.exports = {
  TaskManager: {
    Events: TaskManagerEvents,
  },
  TaskRunner: {
    Events: TaskRunnerEvents,
    States: TaskRunnerStates,
    StateMap: PollQueueStateToNextState,
    DelayTypes: TaskRunnerDelayTypes,
  },
  ErrorCodes: {
    Parser: ParserErrorCodes,
  },
};
