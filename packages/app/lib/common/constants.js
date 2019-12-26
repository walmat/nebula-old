/**
 * IPC keys.
 * @type {Object}
 */
const IPCKeys = {
  RequestShowMessage: 'RequestShowMessage',
  FinishShowMessage: 'FinishShowMessage',

  RequestShowOpenDialog: 'RequestShowOpenDialog',
  FinishShowOpenDialog: 'FinishShowOpenDialog',

  RequestCreateNewWindow: 'RequestCreateNewWindow',
  FinishCreateNewWindow: 'FinishCreateNewWindow',

  RequestCheckForUpdate: 'RequestCheckForUpdate',

  RequestSendMessage: 'RequestSendMessage',
  FinishSendMessage: 'FinishSendMessage',

  RequestGetWindowIDs: 'RequestGetWindowIDs',
  FinishGetWindowIDs: 'FinishGetWindowIDs',

  UpdateWindowIDs: 'UpdateWindowIDs',
  UpdateMessage: 'UpdateMessage',

  AuthRequestActivate: 'AuthRequestActivate',
  AuthRequestDeactivate: 'AuthRequestDeactivate',
  AuthRequestStatus: 'AuthRequestStatus',

  RequestLaunchHarvester: 'RequestLaunchHarvester',
  RequestCloseAllCaptchaWindows: 'RequestCloseAllCaptchaWindows',
  RequestShowProxy: 'RequestShowProxy',
  RequestLaunchYoutube: 'RequestLaunchYoutube',
  RequestCloseWindow: 'RequestCloseWindow',
  RequestMinimizeWindow: 'RequestMinimizeWindow',
  RequestEndSession: 'RequestEndSession',
  RequestGetAppVersion: 'RequestGetAppVersion',
  RequestStartHarvestCaptcha: 'RequestStartHarvestCaptcha',
  RequestStopHarvestCaptcha: 'RequestStopHarvestCaptcha',
  RequestStartHarvestSecure: 'RequestStartHarvestSecure',
  RequestStopHarvestSecure: 'RequestStopHarvestSecure',
  RequestSaveCaptchaProxy: 'RequestSaveCaptchaProxy',

  StartHarvestCaptcha: 'StartHarvestCaptcha',
  StopHarvestCaptcha: 'StopHarvestCaptcha',
  HarvestCaptcha: 'HarvestCaptcha',
  RequestRefresh: 'RequestRefresh',

  StartHarvestSecure: 'StartHarvestSecure',
  StopHarvestSecure: 'StopHarvestSecure',
  HarvestSecure: 'HarvestSecure',

  RequestRegisterTaskEventHandler: 'RequestRegisterTaskEventHandler',
  RegisterTaskEventHandler: 'RegisterTaskEventHander',
  RequestDeregisterTaskEventHandler: 'RequestDeregisterTaskEventhandler',
  DeregisterTaskEventHandler: 'DeregisterTaskEventHander',
  RequestStartTasks: 'RequestStartTasks',
  RequestRestartTasks: 'RequestRestartTasks',
  RequestStopTasks: 'RequestStopTasks',
  RequestAddWebhooks: 'RequestAddWebhooks',
  RequestRemoveWebhooks: 'RequestRemoveWebhooks',
  RequestAddProxies: 'RequestAddProxies',
  RequestRemoveProxies: 'RequestRemoveProxies',
  RequestAbortAllTasksForClose: 'RequestAbortAllTasksForClose',

  RequestChangeDelay: 'RequestChangeDelay',
  RequestWebhookUpdate: 'RequestWebhookUpdate',
  RequestWebhookTest: 'RequestWebhookTest',

  ChangeTheme: 'ChangeTheme',
};

const HARVEST_STATES = {
  IDLE: 'idle',
  SUSPEND: 'suspend',
  ACTIVE: 'active',
};

module.exports.IPCKeys = IPCKeys;

module.exports.HARVEST_STATES = HARVEST_STATES;
