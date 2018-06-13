import makeActionCreator from '../actionCreator';

// Top level Actions
export const SERVER_ACTIONS = {
  ADD: 'ADD_SERVER',
  REMOVE: 'REMOVE_SERVER',
  EDIT: 'EDIT_SERVER',
};

const addServer = makeActionCreator(SERVER_ACTIONS.ADD, 'server');
const removeServer = makeActionCreator(SERVER_ACTIONS.REMOVE, 'id');
const editServer = makeActionCreator(SERVER_ACTIONS.EDIT, 'id', 'field', 'value');

export const serverActions = {
  add: addServer,
  remove: removeServer,
  edit: editServer,
};

// Field Edits
export const SERVER_FIELDS = {
  EDIT_SERVER_TYPE: 'EDIT_SERVER_TYPE',
  EDIT_SERVER_SIZE: 'EDIT_SERVER_SIZE',
  EDIT_SERVER_LOCATION: 'EDIT_SERVER_LOCATION',
  EDIT_PROXY_NUMBER: 'EDIT_PROXY_NUMBER',
  EDIT_PROXY_USERNAME: 'EDIT_PROXY_USERNAME',
  EDIT_PROXY_PASSWORD: 'EDIT_PROXY_PASSWORD',
  EDIT_AWS_USERNAME: 'EDIT_AWS_USERNAME',
  EDIT_AWS_PASSWORD: 'EDIT_AWS_PASSWORD',
};

export const mapServerFieldToKey = {
  [SERVER_FIELDS.EDIT_SERVER_TYPE]: 'server',
  [SERVER_FIELDS.EDIT_SERVER_SIZE]: 'server',
  [SERVER_FIELDS.EDIT_SERVER_LOCATION]: 'server',
  [SERVER_FIELDS.EDIT_PROXY_NUMBER]: 'proxy',
  [SERVER_FIELDS.EDIT_PROXY_USERNAME]: 'proxy',
  [SERVER_FIELDS.EDIT_PROXY_PASSWORD]: 'proxy',
  [SERVER_FIELDS.EDIT_AWS_USERNAME]: 'credentials',
  [SERVER_FIELDS.EDIT_AWS_PASSWORD]: 'credentials',
};
