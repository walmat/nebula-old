const TaskManagerEvents = {
  StartHarvest: 'START_CAPTCHA_HARVEST',
  StopHarvest: 'STOP_CAPTCHA_HARVEST',
  Harvest: 'CAPTCHA_HARVEST',
  SendProxy: 'SEND_PROXY',
  ChangeDelay: 'CHANGE_DELAY',
  SendMonitorDelay: 'SEND_MONITOR_DELAY',
  SendErrorDelay: 'SEND_ERROR_DELAY',
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
  Initialized: 'INIT',
  Started: 'STARTED',
  TaskSetup: 'TASK_SETUP',
  Queue: 'QUEUE',
  Monitor: 'MONITOR',
  PatchCart: 'PATCH_CART',
  ShippingRates: 'SHIPPING_RATES',
  PostPayment: 'POST_PAYMENT',
  PaymentGateway: 'PAYMENT_GATEWAY',
  Review: 'REVIEW',
  Processing: 'PROCESSING',
  Restock: 'RESTOCK',
  SwapProxies: 'SWAP_PROXIES',
  Captcha: 'CAPTCHA',
  Finished: 'FINISHED',
  Errored: 'ERRORED',
  Aborted: 'ABORTED',
  Stopped: 'STOPPED',
};

/**
 * Parser Error Codes
 */
const ParserErrorCodes = {
  ProductNotFound: 400,
};

const CheckoutErrorCodes = {
  OOS: 'OUT_OF_STOCK',
  ATC: 'ADD_TO_CART',
  MonitorForVariant: 'MONITOR_FOR_VARIANT',
  InvalidCheckoutSession: 'INVALID_CHECKOUT_SESSION',
  ShippingRates: 'SHIPPING_RATES',
  InvalidGateway: 'INVALID_GATEWAY',
  InvalidCaptchaToken: 'INVALID_CAPTCHA_TOKEN',
  Review: 'REVIEW',
  CardDeclined: 'CARD_DECLINED',
};

const CheckoutTimeouts = {
  ProcessingPayment: 10000,
};

const ShopifyPaymentSteps = {
  ContactInformation: 'contact_information',
  ShippingMethod: 'shipping_method',
  PaymentMethod: 'payment_method',
  Review: 'review',
};

const getAllSizes = [
  {
    label: 'Clothing',
    options: [
      { value: 'Random', label: 'Random' },
      { value: 'XXS', label: 'Extra Extra Small' },
      { value: 'XS', label: 'Extra Small' },
      { value: 'S', label: 'Small' },
      { value: 'M', label: 'Medium' },
      { value: 'L', label: 'Large' },
      { value: 'XL', label: 'Extra Large' },
      { value: 'XXL', label: 'Extra Extra Large' },
    ],
  },
  {
    label: "US Men's",
    options: [
      { value: 'US Random', label: 'Random' },
      { value: 'US FSR', label: 'Full Size Run' },
      { value: '4', label: '4.0' },
      { value: '4.5', label: '4.5' },
      { value: '5', label: '5.0' },
      { value: '5.5', label: '5.5' },
      { value: '6', label: '6.0' },
      { value: '6.5', label: '6.5' },
      { value: '7', label: '7.0' },
      { value: '7.5', label: '7.5' },
      { value: '8', label: '8.0' },
      { value: '8.5', label: '8.5' },
      { value: '9', label: '9.0' },
      { value: '9.5', label: '9.5' },
      { value: '10', label: '10.0' },
      { value: '10.5', label: '10.5' },
      { value: '11', label: '11.0' },
      { value: '11.5', label: '11.5' },
      { value: '12', label: '12.0' },
      { value: '12.5', label: '12.5' },
      { value: '13', label: '13.0' },
      { value: '14', label: '14.0' },
    ],
  },
  {
    label: "UK Men's",
    options: [
      { value: 'UK Random', label: 'Random' },
      { value: 'UK FSR', label: 'Full Size Run' },
      { value: '3.5', label: '3.5' },
      { value: '4', label: '4' },
      { value: '4.5', label: '4.5' },
      { value: '5', label: '5.0' },
      { value: '5.5', label: '5.5' },
      { value: '6', label: '6.0' },
      { value: '6.5', label: '6.5' },
      { value: '7', label: '7.0' },
      { value: '7.5', label: '7.5' },
      { value: '8', label: '8.0' },
      { value: '8.5', label: '8.5' },
      { value: '9', label: '9.0' },
      { value: '9.5', label: '9.5' },
      { value: '10', label: '10.0' },
      { value: '10.5', label: '10.5' },
      { value: '11', label: '11.0' },
      { value: '11.5', label: '11.5' },
      { value: '12', label: '12.0' },
      { value: '12.5', label: '12.5' },
      { value: '13.5', label: '13.5' },
    ],
  },
  {
    label: "EU Men's",
    options: [
      { value: 'EU Random', label: 'Random' },
      { value: 'EU FSR', label: 'Full Size Run' },
      { value: '36', label: '36' },
      { value: '36 1/3', label: '36 1/3' },
      { value: '36 1/2', label: '36 1/2' },
      { value: '36 2/3', label: '36 2/3' },
      { value: '37', label: '37' },
      { value: '37 1/3', label: '37 1/3' },
      { value: '37 1/2', label: '37 1/2' },
      { value: '37 2/3', label: '37 2/3' },
      { value: '38', label: '38' },
      { value: '38 1/3', label: '38 1/3' },
      { value: '38 1/2', label: '38 1/2' },
      { value: '38 2/3', label: '38 2/3' },
      { value: '39', label: '39' },
      { value: '39 1/3', label: '39 1/3' },
      { value: '39 1/2', label: '39 1/2' },
      { value: '39 2/3', label: '39 2/3' },
      { value: '40', label: '40' },
      { value: '40 1/3', label: '40 1/3' },
      { value: '40 1/2', label: '40 1/2' },
      { value: '40 2/3', label: '40 2/3' },
      { value: '41', label: '41' },
      { value: '41 1/3', label: '41 1/3' },
      { value: '41 1/2', label: '41 1/2' },
      { value: '41 2/3', label: '41 2/3' },
      { value: '42', label: '42' },
      { value: '42 1/3', label: '42 1/3' },
      { value: '42 1/2', label: '42 1/2' },
      { value: '42 2/3', label: '42 2/3' },
      { value: '43', label: '43' },
      { value: '43 1/3', label: '43 1/3' },
      { value: '43 1/2', label: '43 1/2' },
      { value: '43 2/3', label: '43 2/3' },
      { value: '44', label: '44' },
      { value: '44 1/3', label: '44 1/3' },
      { value: '44 1/2', label: '44 1/2' },
      { value: '44 2/3', label: '44 2/3' },
      { value: '45', label: '45' },
      { value: '45 1/3', label: '45 1/3' },
      { value: '45 1/2', label: '45 1/2' },
      { value: '45 2/3', label: '45 2/3' },
      { value: '46', label: '46' },
      { value: '46 1/3', label: '46 1/3' },
      { value: '46 1/2', label: '46 1/2' },
      { value: '46 2/3', label: '46 2/3' },
      { value: '47', label: '47' },
      { value: '47 1/3', label: '47 1/3' },
      { value: '47 1/2', label: '47 1/2' },
      { value: '47 2/3', label: '47 2/3' },
      { value: '48', label: '48' },
      { value: '48 1/3', label: '48 1/3' },
      { value: '48 1/2', label: '48 1/2' },
      { value: '48 2/3', label: '48 2/3' },
      { value: '49', label: '49' },
      { value: '49 1/3', label: '49 1/3' },
      { value: '49 1/2', label: '49 1/2' },
      { value: '49 2/3', label: '49 2/3' },
    ],
  },
];

module.exports = {
  getAllSizes,
  TaskManager: {
    Events: TaskManagerEvents,
  },
  TaskRunner: {
    Events: TaskRunnerEvents,
    States: TaskRunnerStates,
  },
  ErrorCodes: {
    Parser: ParserErrorCodes,
    CheckoutErrorCodes,
  },
  Checkout: {
    CheckoutTimeouts,
    ShopifyPaymentSteps,
  },
};
