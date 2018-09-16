import makeActionCreator from '../actionCreator';

// Top level Actions
export const SERVER_ACTIONS = {
  EDIT: 'EDIT_SERVER_OPTIONS',
  CREATE: 'CREATE_SERVER',
  START: 'START_SERVER',
  STOP: 'STOP_SERVER',
  DESTROY: 'DESTROY_SERVER',
  DESTROY_ALL: 'DESTROY_SERVER',
  ERROR: 'SERVER_HANDLE_ERROR',
  GEN_PROXIES: 'GENERATE_PROXIES',
  DESTROY_PROXIES: 'DESTROY_PROXIES',
  VALIDATE_AWS: 'VALIDATE_AWS_CREDENTIALS',
  LOGOUT_AWS: 'LOGOUT_AWS',
};

// Private API Requests
const _createServerRequest = async (serverOptions, awsCredentials) =>
  // TODO: Replace this with an actual API call
  new Promise((resolve, reject) => {
    if (serverOptions && awsCredentials) {
      resolve({
        path: 'temppath',
        serverOptions,
        awsCredentials,
      });
    } else {
      reject(new Error('parameters should not be null!'));
    }
  });

const _destroyServerRequest = async serverPath =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(serverPath);
    }, 5000);
  });

const _destroyAllServerRequest = async credentials =>
  new Promise((resolve, reject) => {
    resolve(credentials);
  });

const _generateProxiesRequest = async proxyOptions =>
  // TOOD: Replace this with an actual API call
  new Promise((resolve, reject) => {
    if (proxyOptions != null) {
      // convert proxies;
      const proxies = [];
      const { numProxies, username, password } = proxyOptions;
      for (let i = 0; i < numProxies; i += 1) {
        proxies.push({
          ip: 'localhost',
          port: (25000 + i),
          username,
          password,
        });
      }
      resolve(proxies);
    } else {
      reject(new Error('parameters should not be null!'));
    }
  });

const _startServerRequest = async serverInfo =>
  new Promise((resolve, reject) => {
    // TODO - make this request to the aws server with user's credentials
    resolve(serverInfo);
  });

const _stopServerRequest = async serverInfo =>
  new Promise((resolve, reject) => {
    // TODO - make this request to the aws server with user's credentials
    resolve(serverInfo);
  });

const _destroyProxiesRequest = async () =>
  // TODO: Replace this with an actual API call
  Promise.resolve();

const _validateAwsRequest = async awsCredentials =>
  // TODO: Replace this with an actual API call
  new Promise((resolve, reject) => {
    const aKey = awsCredentials.AWSAccessKey;
    const sKey = awsCredentials.AWSSecretKey;
    if (aKey && aKey !== '' && sKey && sKey !== '') {
      resolve('access_token');
    } else {
      reject(new Error('Keys should be valid!'));
    }
  });

// Private Actions
const _createServer = makeActionCreator(SERVER_ACTIONS.CREATE, 'serverInfo');
const _startServer = makeActionCreator(SERVER_ACTIONS.START, 'serverPath');
const _stopServer = makeActionCreator(SERVER_ACTIONS.STOP, 'serverPath');
const _destroyServer = makeActionCreator(SERVER_ACTIONS.DESTROY, 'serverPath');
const _destroyAllServers = makeActionCreator(SERVER_ACTIONS.DESTROY_ALL, 'credentials');
const _generateProxies = makeActionCreator(SERVER_ACTIONS.GEN_PROXIES, 'proxies');
const _connectServer = makeActionCreator(SERVER_ACTIONS.CONNECT, 'credentials');
const _destroyProxies = makeActionCreator(SERVER_ACTIONS.DESTROY_PROXIES);
const _validateAws = makeActionCreator(SERVER_ACTIONS.VALIDATE_AWS, 'token');
const _logoutAws = makeActionCreator(SERVER_ACTIONS.LOGOUT_AWS);

// Public Actions
const handleError = makeActionCreator(SERVER_ACTIONS.ERROR, 'action', 'error');
const editServer = makeActionCreator(SERVER_ACTIONS.EDIT, 'id', 'field', 'value');

// Public Thunks
const createServer = (serverOptions, awsCredentials) =>
  dispatch => _createServerRequest(serverOptions, awsCredentials).then(
    info => dispatch(_createServer(info)),
    error => dispatch(handleError(SERVER_ACTIONS.CREATE, error)),
  );

const startServer = serverPath =>
  dispatch => _startServerRequest(serverPath).then(
    path => dispatch(_startServer(path)),
    error => dispatch(handleError(SERVER_ACTIONS.START, error)),
  );

const stopServer = serverPath =>
  dispatch => _stopServerRequest(serverPath).then(
    path => dispatch(_stopServer(path)),
    error => dispatch(handleError(SERVER_ACTIONS.START, error)),
  );

const destroyServer = serverPath =>
  dispatch => _destroyServerRequest(serverPath).then(
    path => dispatch(_destroyServer(path)),
    error => dispatch(handleError(SERVER_ACTIONS.DESTROY, error)),
  );

const destroyAllServers = credentials =>
  dispatch => _destroyAllServerRequest(credentials).then(
    res => dispatch(_destroyAllServers(res)),
    error => dispatch(handleError(SERVER_ACTIONS.DESTROY_ALL, error)),
  );

const generateProxies = proxyOptions =>
  dispatch => _generateProxiesRequest(proxyOptions).then(
    proxies => dispatch(_generateProxies(proxies)),
    error => dispatch(handleError(SERVER_ACTIONS.GEN_PROXIES, error)),
  );

const connectServer = credentials =>
  dispatch => _connectServer(credentials).then(console.log('yep'));

const destroyProxies = () =>
  dispatch => _destroyProxiesRequest().then(
    () => dispatch(_destroyProxies()),
    error => dispatch(handleError(SERVER_ACTIONS.DESTROY_PROXIES, error)),
  );

const validateAws = awsCredentials =>
  dispatch => _validateAwsRequest(awsCredentials).then(
    token => dispatch(_validateAws(token)),
    error => dispatch(handleError(SERVER_ACTIONS.VALIDATE_AWS, error)),
  );

const logoutAws = path =>
  dispatch => dispatch(destroyProxies())
    .then(() => dispatch(destroyServer(path)))
    .then(() => dispatch(_logoutAws()))
    .catch(error => dispatch(handleError(SERVER_ACTIONS.LOGOUT_AWS, error)));

export const serverActions = {
  edit: editServer,
  create: createServer,
  start: startServer,
  stop: stopServer,
  destroy: destroyServer,
  destroyAll: destroyAllServers,
  error: handleError,
  generateProxies,
  destroyProxies,
  validateAws,
  logoutAws,
};

// Field Edits
export const SERVER_FIELDS = {
  EDIT_SERVER_TYPE: 'EDIT_SERVER_TYPE',
  EDIT_SERVER_SIZE: 'EDIT_SERVER_SIZE',
  EDIT_SERVER_LOCATION: 'EDIT_SERVER_LOCATION',
  EDIT_PROXY_NUMBER: 'EDIT_PROXY_NUMBER',
  EDIT_PROXY_USERNAME: 'EDIT_PROXY_USERNAME',
  EDIT_PROXY_PASSWORD: 'EDIT_PROXY_PASSWORD',
  EDIT_AWS_ACCESS_KEY: 'EDIT_AWS_ACCESS_KEY',
  EDIT_AWS_SECRET_KEY: 'EDIT_AWS_SECRET_KEY',
};

export const mapServerFieldToKey = {
  [SERVER_FIELDS.EDIT_SERVER_TYPE]: 'serverOptions',
  [SERVER_FIELDS.EDIT_SERVER_SIZE]: 'serverOptions',
  [SERVER_FIELDS.EDIT_SERVER_LOCATION]: 'serverOptions',
  [SERVER_FIELDS.EDIT_PROXY_NUMBER]: 'proxyOptions',
  [SERVER_FIELDS.EDIT_PROXY_USERNAME]: 'proxyOptions',
  [SERVER_FIELDS.EDIT_PROXY_PASSWORD]: 'proxyOptions',
  [SERVER_FIELDS.EDIT_AWS_ACCESS_KEY]: 'credentials',
  [SERVER_FIELDS.EDIT_AWS_SECRET_KEY]: 'credentials',
};

export const mapServerListFieldToKey = {
};

export const subMapToKey = {
  [SERVER_FIELDS.EDIT_SERVER_TYPE]: 'type',
  [SERVER_FIELDS.EDIT_SERVER_SIZE]: 'size',
  [SERVER_FIELDS.EDIT_SERVER_LOCATION]: 'location',
  [SERVER_FIELDS.EDIT_PROXY_USERNAME]: 'username',
  [SERVER_FIELDS.EDIT_PROXY_PASSWORD]: 'password',
  [SERVER_FIELDS.EDIT_AWS_ACCESS_KEY]: 'AWSAccessKey',
  [SERVER_FIELDS.EDIT_AWS_SECRET_KEY]: 'AWSSecretKey',
};
