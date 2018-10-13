
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
  RequestLaunchYoutube: 'RequestLaunchYoutube',
  RequestCloseWindow: 'RequestCloseWindow',
  RequestEndSession: 'RequestEndSession',
  RequestGetAppVersion: 'RequestGetAppVersion',

  HarvestCaptcha: 'HarvestCaptcha',
  RequestRefresh: 'RequestRefresh',
};

module.exports = IPCKeys;
