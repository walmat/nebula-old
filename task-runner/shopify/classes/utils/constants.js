const TaskManagerEvents = {
  StartHarvest: 'START_CAPTCHA_HARVEST',
  StopHarvest: 'STOP_CAPTCHA_HARVEST',
  Harvest: 'CAPTCHA_HARVEST',
}

/**
 * Task Runner Event Channel Constants
 */
const TaskRunnerEvents = {
  All: 'ALL',
  TaskStatus: 'TASK_STATUS',
  MonitorStatus: 'MONITOR_STATUS',
  CheckoutStatus: 'CHECKOUT_STATUS',
};

/**
 * Task Runner States
 */
const TaskRunnerStates = {
  Initialized: 'INIT',
  Started: 'STARTED',
  GeneratePaymentTokens: 'GENERATE_PAYMENT_TOKENS',
  CreateCheckout: 'CREATE_CHECKOUT',
  Monitor: 'MONITOR',
  Restock: 'RESTOCK',
  SwapProxies: 'SWAP_PROXIES',
  Checkout: 'CHECKOUT',
  Finished: 'FINISHED',
  Errored: 'ERRORED',
  Aborted: 'ABORTED',
  Stopped: 'STOPPED',
};

module.exports = {
  TaskManager: {
    Events: TaskManagerEvents,
  },
  TaskRunner: {
    Events: TaskRunnerEvents,
    States: TaskRunnerStates,
  },
};
