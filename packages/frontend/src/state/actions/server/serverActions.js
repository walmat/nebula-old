import AWS from 'aws-sdk';

import makeActionCreator from '../actionCreator';
import regexes from '../../../utils/validation';
import {
  _getSecurityGroup,
  wait,
  _waitUntilRunning,
  _waitUntilTerminated,
  _createInstances,
} from './utils';

// Top level Actions
export const SERVER_ACTIONS = {
  EDIT: 'EDIT',
  SELECT: 'SELECT',
  TEST_PROXY: 'TEST_PROXY',
  TEST_PROXIES: 'TEST_PROXIES',
  ERROR: 'SERVER_HANDLE_ERROR',
  GEN_PROXIES: 'GENERATE_PROXIES',
  TERMINATE_PROXY: 'TERMINATE_PROXY',
  TERMINATE_PROXIES: 'TERMINATE_PROXIES',
  VALIDATE_AWS: 'VALIDATE_AWS_CREDENTIALS',
  LOGOUT_AWS: 'LOGOUT_AWS',
};

const _generateProxiesRequest = async (proxyOptions, credentials) =>
  new Promise(async (resolve, reject) => {
    if (
      !credentials ||
      ((credentials && !credentials.AWSAccessKey) || (credentials && !credentials.AWSSecretKey))
    ) {
      return reject(new Error('No credentials provided!'));
    }

    const { AWSAccessKey, AWSSecretKey, name } = credentials;

    const { number, location, username, password } = proxyOptions;

    if (!number) {
      return reject(new Error('Invalid number'));
    }
    if (!username) {
      return reject(new Error('Please specify a username'));
    }
    if (!password) {
      return reject(new Error('Please specify a password'));
    }

    let securityGroup;
    try {
      securityGroup = await _getSecurityGroup(AWSAccessKey, AWSSecretKey, location.value, 'nebula');
    } catch (err) {
      return reject(new Error(err.message || 'Unable to create security group'));
    }

    let instances;
    try {
      instances = await _createInstances(
        AWSAccessKey,
        AWSSecretKey,
        name,
        number,
        location.value,
        username,
        password,
        securityGroup,
      );
    } catch (err) {
      return reject(new Error(err.message || 'Unable to create instances'));
    }
    return resolve(instances);
  });

const _testProxyRequest = async (url, proxy) =>
  new Promise(async (resolve, reject) => {
    const speed = await window.Bridge.testProxy(url, proxy);
    if (!speed) {
      return reject(new Error('Unable to connect'));
    }
    return resolve({ speed, proxy });
  });

const _terminateProxiesRequest = async (options, proxies, credentials) =>
  new Promise(async (resolve, reject) => {
    AWS.config = new AWS.Config({
      accessKeyId: credentials.AWSAccessKey,
      secretAccessKey: credentials.AWSSecretKey,
      region: options.location.value,
    });
    const ec2 = new AWS.EC2({ apiVersion: '2016-11-15' });
    const InstanceIds = proxies.map(p => p.id);

    try {
      await ec2.terminateInstances({ InstanceIds }).promise();
      return resolve(proxies.map(p => ({ proxy: p.proxy, id: p.id })));
    } catch (error) {
      if (/not exist/i.test(error)) {
        return resolve(proxies.map(p => ({ proxy: p.proxy, id: p.id })));
      }
      return reject(new Error('Unable to terminate proxies'));
    }
  });

const _terminateProxyRequest = async (options, proxy, credentials) =>
  new Promise(async (resolve, reject) => {
    AWS.config = new AWS.Config({
      accessKeyId: credentials.AWSAccessKey,
      secretAccessKey: credentials.AWSSecretKey,
      region: options.location.value,
    });
    const ec2 = new AWS.EC2({ apiVersion: '2016-11-15' });

    try {
      await ec2.terminateInstances({ InstanceIds: [proxy.id] }).promise();
      return resolve(proxy);
    } catch (error) {
      console.log(error);
      if (/not exist/i.test(error)) {
        return resolve(proxy);
      }
      return reject(new Error('Unable to terminate proxy'));
    }
  });

const _validateAwsRequest = async awsCredentials =>
  new Promise((resolve, reject) => {
    const { AWSAccessKey, AWSSecretKey, name } = awsCredentials;

    if (!regexes.aws_access_key.test(AWSAccessKey)) {
      return reject(new Error('Invalid Access Key'));
    }

    if (!regexes.aws_secret_key.test(AWSSecretKey)) {
      return reject(new Error('Invalid Secret Key'));
    }

    if (!name) {
      return reject(new Error('Please specify a pairing name'));
    }

    return resolve({ AWSAccessKey, AWSSecretKey, name });
  });

// Private Actions
const _generateProxies = makeActionCreator(SERVER_ACTIONS.GEN_PROXIES, 'response', 'done');
const _terminateProxies = makeActionCreator(SERVER_ACTIONS.TERMINATE_PROXIES, 'response', 'done');
const _terminateProxy = makeActionCreator(SERVER_ACTIONS.TERMINATE_PROXY, 'response', 'done');
const _testProxy = makeActionCreator(SERVER_ACTIONS.TEST_PROXY, 'response');
const _validateAws = makeActionCreator(SERVER_ACTIONS.VALIDATE_AWS, 'response');

// Public Actions
const logoutAws = makeActionCreator(SERVER_ACTIONS.LOGOUT_AWS, 'credentials');
const selectCredentials = makeActionCreator(SERVER_ACTIONS.SELECT, 'credentials');
const handleError = makeActionCreator(SERVER_ACTIONS.ERROR, 'action', 'error', 'cleanup');
const editServer = makeActionCreator(SERVER_ACTIONS.EDIT, 'id', 'field', 'value');

const _handleError = (action, error) => async dispatch => {
  dispatch(handleError(action, error, false));
  await wait(750);
  dispatch(handleError(action, error, true));
};

// Public Thunks
const generateProxies = (proxyOptions, credentials) => dispatch =>
  _generateProxiesRequest(proxyOptions, credentials).then(
    async proxies => {
      dispatch(_generateProxies(proxies, false));
      const instances = await _waitUntilRunning(proxyOptions, proxies, credentials);
      dispatch(_generateProxies(instances, true));
    },
    async error => {
      dispatch(handleError(SERVER_ACTIONS.GEN_PROXIES, error, false));
      await wait(1500);
      dispatch(handleError(SERVER_ACTIONS.GEN_PROXIES, error, true));
    },
  );

const terminateProxies = (options, proxies, credentials) => dispatch =>
  _terminateProxiesRequest(options, proxies, credentials).then(
    async instances => {
      dispatch(_terminateProxies(instances, false));
      const data = await _waitUntilTerminated(options, instances, credentials);
      dispatch(_terminateProxies(data, true));
    },
    async error => {
      dispatch(handleError(SERVER_ACTIONS.TERMINATE_PROXIES, error, false));
      await wait(1500);
      dispatch(handleError(SERVER_ACTIONS.TERMINATE_PROXIES, error, true));
    },
  );

const terminateProxy = (options, proxy, credentials) => dispatch =>
  _terminateProxyRequest(options, proxy, credentials).then(
    async instance => {
      dispatch(_terminateProxy(instance, false));
      const data = await _waitUntilTerminated(options, [instance], credentials);
      dispatch(_terminateProxy(data, true));
    },
    async error => {
      dispatch(handleError(SERVER_ACTIONS.TERMINATE_PROXY, error, false));
      await wait(1500);
      dispatch(handleError(SERVER_ACTIONS.TERMINATE_PROXY, error, true));
    },
  );

const testProxy = (url, proxy) => dispatch =>
  _testProxyRequest(url, proxy).then(
    response => dispatch(_testProxy(response)),
    error => dispatch(handleError(SERVER_ACTIONS.TEST_PROXY, { error, proxy })),
  );

const validateAws = awsCredentials => dispatch =>
  _validateAwsRequest(awsCredentials).then(
    response => dispatch(_validateAws(response)),
    async error => {
      dispatch(handleError(SERVER_ACTIONS.VALIDATE_AWS, error, false));
      await wait(750);
      dispatch(handleError(SERVER_ACTIONS.VALIDATE_AWS, error, true));
    },
  );

export const serverActions = {
  edit: editServer,
  select: selectCredentials,
  error: _handleError,
  testProxy,
  generateProxies,
  terminateProxy,
  terminateProxies,
  validateAws,
  logoutAws,
};

// Field Edits
export const SERVER_FIELDS = {
  EDIT_SERVER_TYPE: 'EDIT_SERVER_TYPE',
  EDIT_SERVER_SIZE: 'EDIT_SERVER_SIZE',
  EDIT_SERVER_LOCATION: 'EDIT_SERVER_LOCATION',
  EDIT_PROXY_NUMBER: 'EDIT_PROXY_NUMBER',
  EDIT_PROXY_LOCATION: 'EDIT_PROXY_LOCATION',
  EDIT_PROXY_CREDENTIALS: 'EDIT_PROXY_CREDENTIALS',
  EDIT_PROXY_USERNAME: 'EDIT_PROXY_USERNAME',
  EDIT_PROXY_PASSWORD: 'EDIT_PROXY_PASSWORD',
  EDIT_AWS_ACCESS_KEY: 'EDIT_AWS_ACCESS_KEY',
  EDIT_AWS_SECRET_KEY: 'EDIT_AWS_SECRET_KEY',
  EDIT_AWS_PAIRING_NAME: 'EDIT_AWS_PAIRING_NAME',
};

export const mapServerFieldToKey = {
  [SERVER_FIELDS.EDIT_SERVER_TYPE]: 'serverOptions',
  [SERVER_FIELDS.EDIT_SERVER_SIZE]: 'serverOptions',
  [SERVER_FIELDS.EDIT_SERVER_LOCATION]: 'serverOptions',
  [SERVER_FIELDS.EDIT_PROXY_NUMBER]: 'proxyOptions',
  [SERVER_FIELDS.EDIT_PROXY_LOCATION]: 'proxyOptions',
  [SERVER_FIELDS.EDIT_PROXY_USERNAME]: 'proxyOptions',
  [SERVER_FIELDS.EDIT_PROXY_PASSWORD]: 'proxyOptions',
  [SERVER_FIELDS.EDIT_AWS_ACCESS_KEY]: 'credentials',
  [SERVER_FIELDS.EDIT_AWS_SECRET_KEY]: 'credentials',
};

export const subMapToKey = {
  [SERVER_FIELDS.EDIT_SERVER_TYPE]: 'type',
  [SERVER_FIELDS.EDIT_SERVER_SIZE]: 'size',
  [SERVER_FIELDS.EDIT_SERVER_LOCATION]: 'location',
  [SERVER_FIELDS.EDIT_PROXY_LOCATION]: 'location',
  [SERVER_FIELDS.EDIT_PROXY_USERNAME]: 'username',
  [SERVER_FIELDS.EDIT_PROXY_PASSWORD]: 'password',
  [SERVER_FIELDS.EDIT_AWS_ACCESS_KEY]: 'AWSAccessKey',
  [SERVER_FIELDS.EDIT_AWS_SECRET_KEY]: 'AWSSecretKey',
};
