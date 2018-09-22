import makeActionCreator from '../actionCreator';
import regexes from '../../../utils/validation';

const AWS = require('aws-sdk');

// Top level Actions
export const SERVER_ACTIONS = {
  EDIT: 'EDIT_SERVER_OPTIONS',
  CREATE: 'CREATE_SERVER',
  START: 'START_SERVER',
  STOP: 'STOP_SERVER',
  DESTROY: 'DESTROY_SERVER',
  DESTROY_ALL: 'DESTROY_SERVERS',
  ERROR: 'SERVER_HANDLE_ERROR',
  GEN_PROXIES: 'GENERATE_PROXIES',
  DESTROY_PROXIES: 'DESTROY_PROXIES',
  VALIDATE_AWS: 'VALIDATE_AWS_CREDENTIALS',
  LOGOUT_AWS: 'LOGOUT_AWS',
};

// Private API Requests
  /**
   * see:
   * exmaples - https://github.com/awsdocs/aws-doc-sdk-examples/blob/master/javascript/example_code/ec2/ec2_createinstances.js
   * docs - https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html
   */
const _createServerRequest = async (serverOptions, awsCredentials) =>
  new Promise((resolve, reject) => {
    console.log(serverOptions, awsCredentials);
    if (serverOptions && awsCredentials) {
      AWS.config = new AWS.Config({
        accessKeyId: awsCredentials.AWSAccessKey,
        secretAccessKey: awsCredentials.AWSSecretKey,
        region: serverOptions.location.value,
      });

      const ec2 = new AWS.EC2();
      const describeParams = {
        KeyNames: [
          'nebula',
        ],
      };
      const createParams = {
        KeyName: 'nebula',
      };
      const instanceParams = {
        ImageId: 'ami-04169656fea786776', // linux 16.04 LTS (we need to find this, cause it changes based on region)
        InstanceType: serverOptions.size.value,
        KeyName: createParams.KeyName,
        MinCount: 1,
        MaxCount: 1,
      };

      const describePromise = ec2.describeKeyPairs(describeParams).promise();

      describePromise.then((data) => {
        if (data.KeyPairs.some(kp => kp.KeyName === 'nebula')) {
          return Promise.resolve();
        }
        return ec2.createKeyPair(createParams).promise();
      }, () =>
        ec2.createKeyPair(createParams).promise()).then(() =>
        ec2.runInstances(instanceParams).promise()).then((data) => {
        resolve({
          path: data.Instances[0].InstanceId,
          serverOptions,
          awsCredentials,
        });
      }).catch((err) => {
        reject(new Error(err));
      });
    } else {
      reject(new Error('parameters should not be null!'));
    }
  });

const _connectServerRequest = async (serverOptions, awsCredentials) =>
  new Promise((resolve, reject) => {
    // TODO - finalize this API request internally
    resolve(serverOptions);
  });

const _destroyServerRequest = async (serverOptions, awsCredentials) =>
  new Promise((resolve, reject) => {
    AWS.config = new AWS.Config({
      accessKeyId: awsCredentials.AWSAccessKey,
      secretAccessKey: awsCredentials.AWSSecretKey,
      region: serverOptions.location.value,
    });
    const ec2 = new AWS.EC2();
    const params = {
      InstanceIds: [
        serverOptions.id,
      ],
    };

    const terminateInstances = ec2.terminateInstances(params).promise();

    /**
      data.Code : data.Name
      ( The low byte represents the state.
      The high byte is used for internal purposes and should be ignored )
      0 : pending
      16 : running
      32 : shutting-down
      48 : terminated
      64 : stopping
      80 : stopped
    */
    terminateInstances.then((data) => {
      resolve(data); // do a window.Bridge fn in preload.js
    }).catch((error) => {
      reject(new Error(error));
    });
  });

const _destroyAllServerRequest = async (servers, awsCredentials) =>
  new Promise((resolve, reject) => {
    AWS.config = new AWS.Config({
      accessKeyId: awsCredentials.AWSAccessKey,
      secretAccessKey: awsCredentials.AWSSecretKey,
      region: servers[0].location.value,
      // what about the case where we have instances in >1 region?
      // maybe this is solved by: https://github.com/walmat/nebula/issues/45
    });
    const ec2 = new AWS.EC2();

    const InstanceIds = servers.map(server => server.id);

    const params = {
      InstanceIds,
    };
    const terminateInstances = ec2.terminateInstances(params).promise();

    /**
      data.Code : data.Name
      ( The low byte represents the state.
      The high byte is used for internal purposes and should be ignored )
      0 : pending
      16 : running
      32 : shutting-down
      48 : terminated
      64 : stopping
      80 : stopped
    */
    terminateInstances.then((data) => {
      resolve(data); // do a window.Bridge fn in preload.js
    }).catch((error) => {
      reject(new Error(error));
    });
  });

const _generateProxiesRequest = async (serverOptions, awsCredentials) =>
  new Promise((resolve, reject) => {
    // todo - finish this implementation
    resolve(serverOptions);
  });

const _startServerRequest = async (serverOptions, awsCredentials) =>
  new Promise((resolve, reject) => {
    AWS.config = new AWS.Config({
      accessKeyId: awsCredentials.AWSAccessKey,
      secretAccessKey: awsCredentials.AWSSecretKey,
      region: serverOptions.location.value,
    });
    const ec2 = new AWS.EC2();
    const params = {
      InstanceIds: [
        serverOptions.id,
      ],
    };
    const startInstances = ec2.startInstances(params).promise();

    /**
      data.Code : data.Name
      ( The low byte represents the state.
      The high byte is used for internal purposes and should be ignored )
      0 : pending
      16 : running
      32 : shutting-down
      48 : terminated
      64 : stopping
      80 : stopped
    */
    startInstances.then((data) => {
      resolve(data); // do a window.Bridge fn in preload.js
    }).catch((error) => {
      reject(new Error(error));
    });
  });

const _stopServerRequest = async (serverOptions, awsCredentials) =>
  new Promise((resolve, reject) => {
    AWS.config = new AWS.Config({
      accessKeyId: awsCredentials.AWSAccessKey,
      secretAccessKey: awsCredentials.AWSSecretKey,
      region: serverOptions.location.value,
    });
    const ec2 = new AWS.EC2();
    const params = {
      InstanceIds: [
        serverOptions.id,
      ],
    };
    const stopInstances = ec2.stopInstances(params).promise();

    /**
      data.Code : data.Name
      ( The low byte represents the state.
      The high byte is used for internal purposes and should be ignored )
      0 : pending
      16 : running
      32 : shutting-down
      48 : terminated
      64 : stopping
      80 : stopped
    */
    stopInstances.then((data) => {
      resolve(data); // do a window.Bridge fn in preload.js
    }).catch((error) => {
      reject(new Error(error));
    });
  });

const _destroyProxiesRequest = async () =>
  // TODO: Replace this with an actual API call
  Promise.resolve();

const _validateAwsRequest = async awsCredentials =>
  // TODO: Replace this with an actual API call
  new Promise((resolve, reject) => {
    const aKey = awsCredentials.AWSAccessKey;
    const sKey = awsCredentials.AWSSecretKey;

    // test the string inputs
    if (regexes.aws_access_key.test(aKey) && regexes.aws_secret_key.test(sKey)) {
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

const startServer = (serverOptions, awsCredentials) =>
  dispatch => _startServerRequest(serverOptions, awsCredentials).then(
    path => dispatch(_startServer(path)),
    error => dispatch(handleError(SERVER_ACTIONS.START, error)),
  );

const stopServer = (serverOptions, awsCredentials) =>
  dispatch => _stopServerRequest(serverOptions, awsCredentials).then(
    path => dispatch(_stopServer(path)),
    error => dispatch(handleError(SERVER_ACTIONS.START, error)),
  );

const destroyServer = (serverOptions, awsCredentials) =>
  dispatch => _destroyServerRequest(serverOptions, awsCredentials).then(
    path => dispatch(_destroyServer(path)),
    error => dispatch(handleError(SERVER_ACTIONS.DESTROY, error)),
  );

const destroyAllServers = (serverOptions, awsCredentials) =>
  dispatch => _destroyAllServerRequest(serverOptions, awsCredentials).then(
    res => dispatch(_destroyAllServers(res)),
    error => dispatch(handleError(SERVER_ACTIONS.DESTROY_ALL, error)),
  );

const generateProxies = proxyOptions =>
  dispatch => _generateProxiesRequest(proxyOptions).then(
    proxies => dispatch(_generateProxies(proxies)),
    error => dispatch(handleError(SERVER_ACTIONS.GEN_PROXIES, error)),
  );

const connectServer = (serverOptions, awsCredentials) =>
  dispatch => _connectServerRequest((serverOptions, awsCredentials)).then(
    res => dispatch(_connectServer(res)),
    error => dispatch(handleError(SERVER_ACTIONS.CONNECT, error)),
  );

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

const logoutAws = (serverOptions, awsCredentials) =>
  dispatch => dispatch(destroyProxies())
    .then(() => dispatch(destroyAllServers(serverOptions, awsCredentials)))
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

export const subMapToKey = {
  [SERVER_FIELDS.EDIT_SERVER_TYPE]: 'type',
  [SERVER_FIELDS.EDIT_SERVER_SIZE]: 'size',
  [SERVER_FIELDS.EDIT_SERVER_LOCATION]: 'location',
  [SERVER_FIELDS.EDIT_PROXY_USERNAME]: 'username',
  [SERVER_FIELDS.EDIT_PROXY_PASSWORD]: 'password',
  [SERVER_FIELDS.EDIT_AWS_ACCESS_KEY]: 'AWSAccessKey',
  [SERVER_FIELDS.EDIT_AWS_SECRET_KEY]: 'AWSSecretKey',
};
