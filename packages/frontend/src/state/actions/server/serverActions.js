import AWS from 'aws-sdk';

import makeActionCreator from '../actionCreator';
import regexes from '../../../utils/validation';

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

const _buildDestroyServerPromises = (servers, awsCredentials) =>
  servers.map(server => {
    AWS.config = new AWS.Config({
      accessKeyId: awsCredentials.AWSAccessKey,
      secretAccessKey: awsCredentials.AWSSecretKey,
      region: server.location.value,
    });
    const ec2 = new AWS.EC2();

    return ec2.terminateInstances({ InstanceIds: [server.id] }).promise();
  });

const _buildDestroyProxiesPromises = (options, proxyList, awsCredentials) =>
  proxyList.map(proxies => {
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
      return ec2.terminateInstances({ InstanceIds }).promise();
    }
    return new Promise((resolve, reject) => reject(new Error('No Proxies For Region')));
  });

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
  new Promise(async (resolve, reject) => {
    AWS.config = new AWS.Config({
      accessKeyId: awsCredentials.AWSAccessKey,
      secretAccessKey: awsCredentials.AWSSecretKey,
      region: serverOptions.location.value,
    });
    const ec2 = new AWS.EC2();
    try {
      const res = await ec2
        .terminateInstances({
          InstanceIds: [serverOptions.id],
        })
        .promise();

      if (!res.TerminatingInstances.length) {
        reject(new Error('No Instances Terminated!'));
      }

      const InstanceIds = res.TerminatingInstances.map(i => i.InstanceId);

      const instances = await ec2.describeInstances({ InstanceIds }).promise();

      if (!instances.Reservations.length) {
        reject(new Error('No Instances Found!'));
      }

      const server = instances.Reservations[0].Instances.map(i => ({
        id: i.InstanceId,
        ip: i.PublicIpAddress,
      }));

      resolve(server);
    } catch (err) {
      reject(new Error(err));
    }
  });

const _destroyAllServerRequest = async (servers, awsCredentials) => {
  const promises = _buildDestroyServerPromises(servers, awsCredentials);
  return new Promise(async (resolve, reject) => {
    if (!promises.length) {
      reject(new Error('No Instances Running!'));
    }
    Promise.all(promises).then(data => {
      const instances = data.map(i => ({ id: i.TerminatingInstances[0].InstanceId }));
      resolve(instances);
    });
  });
};

const _startServerRequest = async (serverOptions, awsCredentials) =>
  new Promise(async (resolve, reject) => {
    AWS.config = new AWS.Config({
      accessKeyId: awsCredentials.AWSAccessKey,
      secretAccessKey: awsCredentials.AWSSecretKey,
      region: serverOptions.location.value,
    });
    const ec2 = new AWS.EC2();

    try {
      const res = await ec2
        .startInstances({
          InstanceIds: [serverOptions.id],
        })
        .promise();
      if (!res.StartingInstances.length) {
        reject(new Error('No Instances Started!'));
      }
      const InstanceIds = res.StartingInstances.map(i => i.InstanceId);

      const instances = await ec2.describeInstances({ InstanceIds }).promise();
      if (!instances.Reservations.length) {
        reject(new Error('No Instances Found!'));
      }

      const server = instances.Reservations[0].Instances.map(i => ({
        id: i.InstanceId,
        ip: i.PublicIpAddress,
      }));

      resolve({ server });
    } catch (err) {
      reject(new Error(err));
    }
  });

const _stopServerRequest = async (serverOptions, awsCredentials) =>
  new Promise(async (resolve, reject) => {
    AWS.config = new AWS.Config({
      accessKeyId: awsCredentials.AWSAccessKey,
      secretAccessKey: awsCredentials.AWSSecretKey,
      region: serverOptions.location.value,
    });
    const ec2 = new AWS.EC2();

    try {
      const res = await ec2
        .stopInstances({
          InstanceIds: [serverOptions.id],
        })
        .promise();

      if (!res.StoppingInstances.length) {
        reject(new Error('No Instances Stopped!'));
      }

      const InstanceIds = res.StoppingInstances.map(i => i.InstanceId);

      const instances = await ec2.describeInstances({ InstanceIds }).promise();
      if (!instances.Reservations.length) {
        reject(new Error('No Instances Found!'));
      }

      const servers = instances.Reservations[0].Instances.map(i => ({
        id: i.InstanceId,
        ip: i.PublicIpAddress,
      }));

      resolve({ servers });
    } catch (err) {
      reject(new Error(err));
    }
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
          CreditSpecification: { CpuCredits: 'Unlimited' },
          T2T3Unlmited: true,
          KeyName: 'nebula',
          MinCount: proxyOptions.numProxies,
          MaxCount: proxyOptions.numProxies,
          // base64 encoded `bash_script.txt`
          UserData:
            'IyEvYmluL2Jhc2gNCg0KYXB0LWdldCB1cGRhdGUNCg0Kc2xlZXAgMTUNCg0KY2xlYXINCg0KYXB0LWdldCBpbnN0YWxsIHNxdWlkIC15DQphcHQtZ2V0IGluc3RhbGwgYXBhY2hlMi11dGlscyAteQ0KDQpybSAtcmYgL2V0Yy9zcXVpZC9zcXVpZC5jb25mDQoNCnRvdWNoIC9ldGMvc3F1aWQvc3F1aWQuY29uZg0KDQplY2hvIC1lICINCmZvcndhcmRlZF9mb3Igb2ZmDQp2aXNpYmxlX2hvc3RuYW1lIHNxdWlkLnNlcnZlci5jb21tbQ0KDQphdXRoX3BhcmFtIGJhc2ljIHByb2dyYW0gL3Vzci9saWIvc3F1aWQzL2Jhc2ljX25jc2FfYXV0aCAvZXRjL3NxdWlkL3NxdWlkX3Bhc3N3ZA0KYXV0aF9wYXJhbSBiYXNpYyByZWFsbSBwcm94eQ0KYWNsIGF1dGhlbnRpY2F0ZWQgcHJveHlfYXV0aCBSRVFVSVJFRA0KaHR0cF9hY2Nlc3MgYWxsb3cgYXV0aGVudGljYXRlZA0KDQpodHRwX3BvcnQgODANCg0KcmVxdWVzdF9oZWFkZXJfYWNjZXNzIEFsbG93IGFsbG93IGFsbA0KcmVxdWVzdF9oZWFkZXJfYWNjZXNzIEF1dGhvcml6YXRpb24gYWxsb3cgYWxsDQpyZXF1ZXN0X2hlYWRlcl9hY2Nlc3MgV1dXLUF1dGhlbnRpY2F0ZSBhbGxvdyBhbGwNCnJlcXVlc3RfaGVhZGVyX2FjY2VzcyBQcm94eS1BdXRob3JpemF0aW9uIGFsbG93IGFsbA0KcmVxdWVzdF9oZWFkZXJfYWNjZXNzIFByb3h5LUF1dGhlbnRpY2F0ZSBhbGxvdyBhbGwNCnJlcXVlc3RfaGVhZGVyX2FjY2VzcyBDYWNoZS1Db250cm9sIGFsbG93IGFsbA0KcmVxdWVzdF9oZWFkZXJfYWNjZXNzIENvbnRlbnQtRW5jb2RpbmcgYWxsb3cgYWxsDQpyZXF1ZXN0X2hlYWRlcl9hY2Nlc3MgQ29udGVudC1MZW5ndGggYWxsb3cgYWxsDQpyZXF1ZXN0X2hlYWRlcl9hY2Nlc3MgQ29udGVudC1UeXBlIGFsbG93IGFsbA0KcmVxdWVzdF9oZWFkZXJfYWNjZXNzIERhdGUgYWxsb3cgYWxsDQpyZXF1ZXN0X2hlYWRlcl9hY2Nlc3MgRXhwaXJlcyBhbGxvdyBhbGwNCnJlcXVlc3RfaGVhZGVyX2FjY2VzcyBIb3N0IGFsbG93IGFsbA0KcmVxdWVzdF9oZWFkZXJfYWNjZXNzIElmLU1vZGlmaWVkLVNpbmNlIGFsbG93IGFsbA0KcmVxdWVzdF9oZWFkZXJfYWNjZXNzIExhc3QtTW9kaWZpZWQgYWxsb3cgYWxsDQpyZXF1ZXN0X2hlYWRlcl9hY2Nlc3MgTG9jYXRpb24gYWxsb3cgYWxsDQpyZXF1ZXN0X2hlYWRlcl9hY2Nlc3MgUHJhZ21hIGFsbG93IGFsbA0KcmVxdWVzdF9oZWFkZXJfYWNjZXNzIEFjY2VwdCBhbGxvdyBhbGwNCnJlcXVlc3RfaGVhZGVyX2FjY2VzcyBBY2NlcHQtQ2hhcnNldCBhbGxvdyBhbGwNCnJlcXVlc3RfaGVhZGVyX2FjY2VzcyBBY2NlcHQtRW5jb2RpbmcgYWxsb3cgYWxsDQpyZXF1ZXN0X2hlYWRlcl9hY2Nlc3MgQWNjZXB0LUxhbmd1YWdlIGFsbG93IGFsbA0KcmVxdWVzdF9oZWFkZXJfYWNjZXNzIENvbnRlbnQtTGFuZ3VhZ2UgYWxsb3cgYWxsDQpyZXF1ZXN0X2hlYWRlcl9hY2Nlc3MgTWltZS1WZXJzaW9uIGFsbG93IGFsbA0KcmVxdWVzdF9oZWFkZXJfYWNjZXNzIFJldHJ5LUFmdGVyIGFsbG93IGFsbA0KcmVxdWVzdF9oZWFkZXJfYWNjZXNzIFRpdGxlIGFsbG93IGFsbA0KcmVxdWVzdF9oZWFkZXJfYWNjZXNzIENvbm5lY3Rpb24gYWxsb3cgYWxsDQpyZXF1ZXN0X2hlYWRlcl9hY2Nlc3MgUHJveHktQ29ubmVjdGlvbiBhbGxvdyBhbGwNCnJlcXVlc3RfaGVhZGVyX2FjY2VzcyBVc2VyLUFnZW50IGFsbG93IGFsbA0KcmVxdWVzdF9oZWFkZXJfYWNjZXNzIENvb2tpZSBhbGxvdyBhbGwNCnJlcXVlc3RfaGVhZGVyX2FjY2VzcyBBbGwgZGVueSBhbGwiID4+IC9ldGMvc3F1aWQvc3F1aWQuY29uZgoNCmh0cGFzc3dkIC1iIC1jIC9ldGMvc3F1aWQvc3F1aWRfcGFzc3dkIHRlc3QgdGVzdCAKDQpzZXJ2aWNlIHNxdWlkIHJlc3RhcnQNCg0KY2xlYXI=',
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
        ip: `${i.PublicIpAddress}:80:${proxyOptions.username}:${proxyOptions.password}`,
      }));
      console.log('SERVER: proxies: %j', proxies);
      resolve({ region: proxyOptions.location.value, proxies });
    } catch (err) {
      reject(new Error(err));
    }
  });

const _destroyProxiesRequest = async (options, proxyList, awsCredentials) => {
  const promises = _buildDestroyProxiesPromises(options, proxyList, awsCredentials);
  return new Promise(async (resolve, reject) => {
    if (!promises.length) {
      reject(new Error('No Proxy Instances Running!'));
    }
    Promise.all(promises).then(
      data => {
        console.log(data);
        const instances = data.map(i => ({ id: i.TerminatingInstances[0].InstanceId }));
        console.log(instances);
        resolve(instances);
      },
      err => {
        reject(err);
      },
    );
  });
};

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
const _connectServer = makeActionCreator(SERVER_ACTIONS.CONNECT, 'serverInfo', 'credentials');
const _startServer = makeActionCreator(SERVER_ACTIONS.START, 'serverPath');
const _stopServer = makeActionCreator(SERVER_ACTIONS.STOP, 'serverPath');
const _destroyServer = makeActionCreator(SERVER_ACTIONS.DESTROY, 'instance');
const _destroyAllServers = makeActionCreator(SERVER_ACTIONS.DESTROY_ALL, 'instances');
const _generateProxies = makeActionCreator(SERVER_ACTIONS.GEN_PROXIES, 'proxyInfo');
const _destroyProxies = makeActionCreator(SERVER_ACTIONS.DESTROY_PROXIES, 'instances');
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
