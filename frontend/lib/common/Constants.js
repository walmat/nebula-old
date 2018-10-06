
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

  LaunchHarvester: 'LaunchHarvester',
  LaunchYoutube: 'LaunchYoutube',
  CloseWindow: 'CloseWindow',
};

module.exports = IPCKeys;
