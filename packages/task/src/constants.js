const TaskManagerEvents = {
  Abort: 'ABORT',
  StartHarvest: 'START_CAPTCHA_HARVEST',
  StopHarvest: 'STOP_CAPTCHA_HARVEST',
  Harvest: 'CAPTCHA_HARVEST',
  SendProxy: 'SEND_PROXY',
  DeregisterProxy: 'DEREGISTER_PROXY',
  ChangeDelay: 'CHANGE_DELAY',
  UpdateHook: 'UPDATE_HOOK',
  ProductFound: 'PRODUCT_FOUND',
  Webhook: 'WEBHOOK',
  Success: 'SUCCESS',
};

const TaskEvents = {
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

const SiteKeyForPlatform = {
  [Platforms.Shopify]: '6LeoeSkTAAAAAA9rkZs5oS82l69OEYjKRZAiKdaF',
  [Platforms.Supreme]: '6LeWwRkUAAAAAOBsau7KpuC9AV-6J8mhw4AjC3Xz',
  [Platforms.Footsites]: '',
  [Platforms.Mesh]: '',
};

const Manager = {
  Events: TaskManagerEvents,
};

const Task = {
  Events: TaskEvents,
};

export { Manager, Task, Platforms, SiteKeyForPlatform };
