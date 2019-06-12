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

  RequestCheckForUpdates: 'RequestCheckForUpdates',

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
  RequestSaveCaptchaProxy: 'RequestSaveCaptchaProxy',

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

  RequestRegisterProxyEventHandler: 'RequestRegisterProxyEventHandler',
  RegisterProxyEventHandler: 'RegisterProxyEventHandler',
  RequestDeregisterProxyEventHandler: 'RequestDeregisterProxyEventHandler',
  DeregisterProxyEventHandler: 'DeregisterProxyEventHandler',
  RequestStartGenerate: 'RequestStartGenerate',
  RequestStopGenerate: 'RequestStopGenerate',
  RequestDestroyProxies: 'RequestDestroyProxies',
  RequestAbortAllGeneratorsForClose: 'RequestAbortAllGeneratorsForClose',

  RequestChangeDelay: 'RequestChangeDelay',
  RequestWebhookUpdate: 'RequestWebhookUpdate',
  RequestWebhookTest: 'RequestWebhookTest',

  ChangeTheme: 'ChangeTheme',
};

module.exports = IPCKeys;
