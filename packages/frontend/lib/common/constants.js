
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
  RequestLaunchYoutube: 'RequestLaunchYoutube',
  RequestCloseWindow: 'RequestCloseWindow',
  RequestEndSession: 'RequestEndSession',
  RequestGetAppVersion: 'RequestGetAppVersion',
  RequestStartHarvestCaptcha: 'RequestStartHarvestCaptcha',
  RequestStopHarvestCaptcha: 'RequestStopHarvestCaptcha',

  StartHarvestCaptcha: 'StartHarvestCaptcha',
  StopHarvestCaptcha: 'StopHarvestCaptcha',
  HarvestCaptcha: 'HarvestCaptcha',
  RequestRefresh: 'RequestRefresh',

  RequestRegisterTaskEventHandler: 'RequestRegisterTaskEventHandler',
  RegisterTaskEventHandler: 'RegisterTaskEventHander',
  RequestDeregisterTaskEventHandler: 'RequestDeregisterTaskEventhandler',
  DeregisterTaskEventHandler: 'DeregisterTaskEventHander',
  RequestStartTasks: 'RequestStartTasks',
  RequestStopTasks: 'RequestStopTasks',
  RequestAddProxies: 'RequestAddProxies',
  RequestRemoveProxies: 'RequestRemoveProxies',
  RequestAbortAllTasksForClose: 'RequestAbortAllTasksForClose',

  RequestChangeDelay: 'RequestChangeDelay',
  RequestWebhookUpdate: 'RequestWebhookUpdate',
  RequestWebhookTest: 'RequestWebhookTest',
};

module.exports = IPCKeys;
