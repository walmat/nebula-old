
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

  HarvestCaptcha: 'HarvestCaptcha',
  RequestRefresh: 'RequestRefresh',

  RequestRegisterTaskEventHandler: 'RequestRegisterTaskEventHandler',
  RequestDeregisterTaskEventHandler: 'RequestDeregisterTaskEventhandler',
  RequestStartTasks: 'RequestStartTasks',
  RequestStopTasks: 'RequestStopTasks',
  RequestAddProxies: 'RequestAddProxies',
  RequestRemoveProxies: 'RequestRemoveProxies',
};

module.exports = IPCKeys;
