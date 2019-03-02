import makeActionCreator from '../actionCreator';
import regexes from '../../../utils/validation';

const AWS = require('aws-sdk');

const sleep = delay => new Promise(resolve => setTimeout(resolve, delay));

const rand = (min, max) => Math.random() * (max - min) + min;

// Top level Actions
export const SERVER_ACTIONS = {
  EDIT: 'EDIT_SERVER_OPTIONS',
  CREATE: 'CREATE_SERVER',
  CONNECT: 'CONNECT_SERVER',
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

      const ec2 = new AWS.EC2();
      const describeParams = {
        KeyNames: ['nebula'],
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

      describePromise
        .then(
          data => {
            if (data.KeyPairs.some(kp => kp.KeyName === 'nebula')) {
              return Promise.resolve();
            }
            return ec2.createKeyPair(createParams).promise();
          },
          () => ec2.createKeyPair(createParams).promise(),
        )
        .then(() => ec2.runInstances(instanceParams).promise())
        .then(data => {
          resolve({
            path: data.Instances[0].InstanceId,
            serverOptions,
            awsCredentials,
          });
        })
        .catch(err => {
          reject(new Error(err));
        });
    } else {
      reject(new Error('parameters should not be null!'));
    }
  });

const _connectServerRequest = async (serverOptions, awsCredentials) =>
  new Promise((resolve, reject) => {
    if (serverOptions && awsCredentials) {
      resolve({ server: serverOptions, credentials: awsCredentials });
    } else {
      reject(new Error('invalid parameters'));
    }
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
      InstanceIds: [serverOptions.id],
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
    terminateInstances
      .then(data => {
        resolve(data); // do a window.Bridge fn in preload.js
      })
      .catch(error => {
        reject(new Error(error));
      });
  });

const _destroyAllServerRequest = async (servers, awsCredentials) =>
  new Promise(async (resolve, reject) => {
    const promises = await servers.forEach(server => {
      AWS.config = new AWS.Config({
        accessKeyId: awsCredentials.AWSAccessKey,
        secretAccessKey: awsCredentials.AWSSecretKey,
        region: server.location.value,
      });
      const ec2 = new AWS.EC2();

      const params = {
        InstanceIds: [server.id],
      };

      ec2
        .terminateInstances(params)
        .promise()
        .then(data => {
          resolve(data);
        })
        .catch(error => {
          reject(new Error(error));
        });
    });
    resolve(promises);
  });

const _generateProxiesRequest = async (proxyOptions, awsCredentials) =>
  new Promise(async (resolve, reject) => {
    // setup & config
    AWS.config = new AWS.Config({
      accessKeyId: awsCredentials.AWSAccessKey,
      secretAccessKey: awsCredentials.AWSSecretKey,
      region: proxyOptions.location.value,
    });
    const ec2 = new AWS.EC2();

    try {
      // create keypair (if it doens't exist)
      const keyPairs = await ec2.describeKeyPairs({ KeyNames: ['nebula'] }).promise();
      let keyPair = keyPairs.KeyPairs.find(kp => kp.KeyName === 'nebula');
      console.log('SERVER: Keypair: %j', keyPair);
      if (!keyPair) {
        console.log('SERVER: Keypair not found, creating!');
        keyPair = await ec2.createKeyPair({ KeyName: 'nebula' }).promise();
      }

      // create instances
      const instances = await ec2
        .runInstances({
          ImageId: 'ami-04169656fea786776', // linux 16.04 LTS (we need to create a mapping of this, cause it changes based on region)
          InstanceType: 't2.micro',
          KeyName: 'nebula',
          MinCount: proxyOptions.numProxies,
          MaxCount: proxyOptions.numProxies,
        })
        .promise();
      if (!instances.Instances.length) {
        reject(new Error('Instances Not Created!'));
      }
      console.log('SERVER: instances launched: %j', instances);

      // wait a few seconds to let the instances start up..
      // TODO - maybe use a polling method here or something?
      await sleep(rand(3000, 5000));
      const InstanceIds = instances.Instances.map(i => i.InstanceId);
      const proxyInstances = await ec2.describeInstances({ InstanceIds }).promise();

      if (!proxyInstances.Reservations.length) {
        reject(new Error('Reservations Not Ready!'));
      }
      console.log('SERVER: proxy instances: %j', proxyInstances);
      const proxies = await proxyInstances.Reservations[0].Instances.map(i => ({
        id: i.InstanceId,
        ip: `${i.PublicIpAddress}:8080:${proxyOptions.username}:${proxyOptions.password}`,
      }));
      console.log('SERVER: proxies: %j', proxies);
      resolve({ region: proxyOptions.location.value, proxies });
    } catch (err) {
      reject(new Error(err));
    }
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
      InstanceIds: [serverOptions.id],
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
    startInstances
      .then(data => {
        resolve(data); // do a window.Bridge fn in preload.js
      })
      .catch(error => {
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
      InstanceIds: [serverOptions.id],
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
    stopInstances
      .then(data => {
        resolve(data); // do a window.Bridge fn in preload.js
      })
      .catch(error => {
        reject(new Error(error));
      });
  });

const _destroyProxiesRequest = async (options, proxyList, awsCredentials) =>
  new Promise(async (resolve, reject) => {
    const instances = proxyList.forEach(async proxies => {
      console.log('SERVER: proxy object: %j', proxies);
      if (!options || proxies.region === options.location.value) {
        AWS.config = new AWS.Config({
          accessKeyId: awsCredentials.AWSAccessKey,
          secretAccessKey: awsCredentials.AWSSecretKey,
          region: proxies.region,
        });
        const ec2 = new AWS.EC2();
        const InstanceIds = proxies.proxies.map(p => p.id);
        console.log('SERVER: proxy instanceIds: %j', InstanceIds);

        try {
          const res = await ec2.terminateInstances({ InstanceIds }).promise();

          if (!res.TerminatingInstances.length) {
            // exit early...
            resolve(new Error('No Instances Terminated!'));
          }

          const terminatedInstances = await res.TerminatingInstances.map(t => t.InstanceId);
          console.log('SERVER: terminated instances: %j', terminatedInstances);

          return { instances: terminatedInstances };
        } catch (err) {
          reject(new Error(err));
        }
      }
    });
    resolve(instances);
  });

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
const _generateProxies = makeActionCreator(SERVER_ACTIONS.GEN_PROXIES, 'proxyInfo');
const _connectServer = makeActionCreator(SERVER_ACTIONS.CONNECT, 'serverInfo', 'credentials');
const _destroyProxies = makeActionCreator(SERVER_ACTIONS.DESTROY_PROXIES, 'proxies');
const _validateAws = makeActionCreator(SERVER_ACTIONS.VALIDATE_AWS, 'token');
const _logoutAws = makeActionCreator(SERVER_ACTIONS.LOGOUT_AWS);

// Public Actions
const handleError = makeActionCreator(SERVER_ACTIONS.ERROR, 'action', 'error');
const editServer = makeActionCreator(SERVER_ACTIONS.EDIT, 'id', 'field', 'value');

// Public Thunks
const createServer = (serverOptions, awsCredentials) => dispatch =>
  _createServerRequest(serverOptions, awsCredentials).then(
    info => dispatch(_createServer(info)),
    error => dispatch(handleError(SERVER_ACTIONS.CREATE, error)),
  );

const startServer = (serverOptions, awsCredentials) => dispatch =>
  _startServerRequest(serverOptions, awsCredentials).then(
    path => dispatch(_startServer(path)),
    error => dispatch(handleError(SERVER_ACTIONS.START, error)),
  );

const connectServer = (serverOptions, awsCredentials) => dispatch =>
  _connectServerRequest(serverOptions, awsCredentials).then(
    res => dispatch(_connectServer(res.server, res.credentials)),
    error => dispatch(handleError(SERVER_ACTIONS.CONNECT, error)),
  );

const stopServer = (serverOptions, awsCredentials) => dispatch =>
  _stopServerRequest(serverOptions, awsCredentials).then(
    path => dispatch(_stopServer(path)),
    error => dispatch(handleError(SERVER_ACTIONS.START, error)),
  );

const destroyServer = (serverOptions, awsCredentials) => dispatch =>
  _destroyServerRequest(serverOptions, awsCredentials).then(
    path => dispatch(_destroyServer(path)),
    error => dispatch(handleError(SERVER_ACTIONS.DESTROY, error)),
  );

const destroyAllServers = (serverOptions, awsCredentials) => dispatch =>
  _destroyAllServerRequest(serverOptions, awsCredentials).then(
    res => dispatch(_destroyAllServers(res)),
    error => dispatch(handleError(SERVER_ACTIONS.DESTROY_ALL, error)),
  );

const generateProxies = (proxyOptions, awsCredentials) => dispatch =>
  _generateProxiesRequest(proxyOptions, awsCredentials).then(
    proxies => dispatch(_generateProxies(proxies)),
    error => dispatch(handleError(SERVER_ACTIONS.GEN_PROXIES, error)),
  );

const destroyProxies = (options, proxies, awsCredentials) => dispatch =>
  _destroyProxiesRequest(options, proxies, awsCredentials).then(
    instances => dispatch(_destroyProxies(instances)),
    error => dispatch(handleError(SERVER_ACTIONS.DESTROY_PROXIES, error)),
  );

const validateAws = awsCredentials => dispatch =>
  _validateAwsRequest(awsCredentials).then(
    token => dispatch(_validateAws(token)),
    error => dispatch(handleError(SERVER_ACTIONS.VALIDATE_AWS, error)),
  );

const logoutAws = (servers, proxies, awsCredentials) => dispatch =>
  dispatch(destroyProxies(null, proxies, awsCredentials))
    .then(() => dispatch(destroyAllServers(servers, awsCredentials)))
    .then(() => dispatch(_logoutAws()))
    .catch(error => dispatch(handleError(SERVER_ACTIONS.LOGOUT_AWS, error)));

export const serverActions = {
  edit: editServer,
  create: createServer,
  connect: connectServer,
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
  EDIT_PROXY_LOCATION: 'EDIT_PROXY_LOCATION',
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
