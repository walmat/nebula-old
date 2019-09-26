const TaskManagerEvents = {
  Abort: 'ABORT',
  StartHarvest: 'START_CAPTCHA_HARVEST',
  StopHarvest: 'STOP_CAPTCHA_HARVEST',
  Harvest: 'CAPTCHA_HARVEST',
  SendProxy: 'SEND_PROXY',
  ChangeDelay: 'CHANGE_DELAY',
  UpdateHook: 'UPDATE_HOOK',
  ProductFound: 'PRODUCT_FOUND',
  Webhook: 'WEBHOOK',
};

const TaskRunnerEvents = {
  All: 'ALL',
  TaskStatus: 'TASK_STATUS',
  MonitorStatus: 'MONITOR_STATUS',
  SwapTaskProxy: 'SWAP_TASK_PROXY',
  SwapMonitorProxy: 'SWAP_MONITOR_PROXY',
  ReceiveProxy: 'RECEIVE_PROXY',
};

const Platforms = {
  Shopify: 'Shopify',
  Footsites: 'Footsites',
  Supreme: 'Supreme',
  Mesh: 'Mesh',
};

module.exports = {
  Manager: {
    Events: TaskManagerEvents,
  },
  Runner: {
    Events: TaskRunnerEvents,
  },
  Platforms,
};
