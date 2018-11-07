/**
 * Task Runner Event Channel Constants
 */
const Events = {
    All: 'ALL',
    TaskStatus: 'TASK_STATUS',
    MonitorStatus: 'MONITOR_STATUS',
    CheckoutStatus: 'CHECKOUT_STATUS',
};

/**
 * Task Runner States
 */
const States = {
    Initialized: 'INIT',
    Started: 'STARTED',
    GenAltCheckout: 'GEN_ALT_CHECKOUT',
    Monitor: 'MONITOR',
    Restock: 'RESTOCK',
    SwapProxies: 'SWAP_PROXIES',
    Checkout: 'CHECKOUT',
    Finished: 'FINISHED',
    Aborted: 'ABORTED',
    Stopped: 'STOPPED',
};

module.exports = {
  TaskRunner: {
    Events,
    States,
  }
};