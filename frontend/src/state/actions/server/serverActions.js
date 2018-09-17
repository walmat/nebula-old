import makeActionCreator from '../actionCreator';

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
    if (serverOptions && awsCredentials) {
      AWS.config = new AWS.Config({
        accessKeyId: awsCredentials.AWSAccessKey,
        secretAccessKey: awsCredentials.AWSSecretKey,
        region: serverOptions.location.value,
      });

      // ec2 object
      const ec2 = new AWS.EC2();
      const describeParams = {
        KeyNames: [
          'nebula',
        ],
      };
      const createParams = {
        KeyName: 'nebula',
      };

      // list all key pair names
      ec2.describeKeyPairs(describeParams, (err, data) => {
        if (err) {
          // try creating the keypair
          ec2.createKeyPair(createParams, (e, d) => {
            if (e) {
              console.log(e);
            } else {
              console.log(d.KeyName);
            }
          });
        } else if (!data.KeyPairs.some(kp => kp.KeyName === 'nebula' )) {
          ec2.createKeyPair(createParams, (error) => {
            if (error) {
              reject(new Error('Unable to create keypair'));
            } // otherwise the keypair should be created fine
          });
        }
      });

      // parameters for the instance
      const instanceParams = {
        ImageId: 'ami-04169656fea786776', // linux 16.04 LTS (we need to find this, cause it changes based on region)
        InstanceType: serverOptions.size.value,
        KeyName: createParams.KeyName,
        MinCount: 1,
        MaxCount: 1,
      };

      // maybe await this?
      ec2.runInstances(instanceParams).promise().then((data) => {
        console.log(data);
        const instanceId = data.Instances[0].InstanceId; //  we might need to keep track of this to destroy/stop later?
        console.log('Created instance', instanceId);

        resolve({
          path: instanceId,
          serverOptions,
          awsCredentials,
        });
      }).catch((err) => {
        // error handling
        if (err.statusCode === 401) {
          reject(new Error('Not subscribed to AWS'));
        }
        console.error(err, err.stack);
      });
    } else {
      reject(new Error('parameters should not be null!'));
    }
  });

/**
 * grabs current running instances for the user
 * @param {*} credentials - user's AWS access/secret key
 */
const _getCurrentInstances = async (serverOptions, awsCredentials) =>
  new Promise((resolve, reject) => {
    AWS.config = new AWS.Config({
      accessKeyId: awsCredentials.AWSAccessKey,
      secretAccessKey: awsCredentials.AWSSecretKey,
      region: serverOptions.location.value,
    });
    const ec2 = new AWS.EC2();
    ec2.describeInstances({}, (err, data) => {
      if (err) {
        reject(new Error(err));
      } else {
        console.log(data);
        resolve(data);
      }
    });
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
    ec2.terminateInstances(params, (err, data) => {
      if (err) {
        reject(new Error(err));
      } else {
        /** data.Code : data.Name
          ( The low byte represents the state.
          The high byte is used for internal purposes and should be ignored )
          0 : pending
          16 : running
          32 : shutting-down
          48 : terminated
          64 : stopping
          80 : stopped
         */
        console.log(data);
        resolve(data);
      }
    });
  });

const _destroyAllServerRequest = async (serverOptions, awsCredentials) =>
  new Promise((resolve, reject) => {
    // todo - finish this implementation
    resolve(serverOptions);
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
        serverOptions.instanceId,
      ],
    };
    ec2.startInstances(params, (err, data) => {
      if (err) {
        reject(new Error(err));
      } else {
        /** data.Code : data.Name
          ( The low byte represents the state.
          The high byte is used for internal purposes and should be ignored )
          0 : pending
          16 : running
          32 : shutting-down
          48 : terminated
          64 : stopping
          80 : stopped
         */
        resolve(data);
      }
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
        serverOptions.instanceId, // fix this later..
      ],
    };
    ec2.stopInstances(params, (err, data) => {
      if (err) {
        reject(new Error(err));
      } else {
        /** data.Code : data.Name
          ( The low byte represents the state.
          The high byte is used for internal purposes and should be ignored )
          0 : pending
          16 : running
          32 : shutting-down
          48 : terminated
          64 : stopping
          80 : stopped
         */
        resolve(data);
      }
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

const destroyServer = (serverOptions, awsCredentials) =>
  dispatch => _destroyServerRequest(serverOptions, awsCredentials).then(
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

export const subMapToKey = {
  [SERVER_FIELDS.EDIT_SERVER_TYPE]: 'type',
  [SERVER_FIELDS.EDIT_SERVER_SIZE]: 'size',
  [SERVER_FIELDS.EDIT_SERVER_LOCATION]: 'location',
  [SERVER_FIELDS.EDIT_PROXY_USERNAME]: 'username',
  [SERVER_FIELDS.EDIT_PROXY_PASSWORD]: 'password',
  [SERVER_FIELDS.EDIT_AWS_ACCESS_KEY]: 'AWSAccessKey',
  [SERVER_FIELDS.EDIT_AWS_SECRET_KEY]: 'AWSSecretKey',
};
