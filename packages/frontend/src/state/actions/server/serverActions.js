import AWS from 'aws-sdk';

import makeActionCreator from '../actionCreator';
import regexes from '../../../utils/validation';

const sleep = delay => new Promise(resolve => setTimeout(resolve, delay));
const rand = (min, max) => Math.random() * (max - min) + min;

// Top level Actions
export const SERVER_ACTIONS = {
  EDIT: 'EDIT',
  SELECT: 'SELECT',
  ERROR: 'SERVER_HANDLE_ERROR',
  GEN_PROXIES: 'GENERATE_PROXIES',
  DESTROY_PROXIES: 'DESTROY_PROXIES',
  VALIDATE_AWS: 'VALIDATE_AWS_CREDENTIALS',
  CLEANUP_STATUS: 'CLEANUP_STATUS',
  LOGOUT_AWS: 'LOGOUT_AWS',
};

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

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

const _generateProxiesRequest = async (proxyOptions, credentials) =>
  new Promise(async (resolve, reject) => {
    if (!credentials) {
      reject(new Error('No credentials provided!'));
    }

    const { label, value } = credentials;
    const { number, location, username, password } = proxyOptions;
    // setup & config
    AWS.config = new AWS.Config({
      accessKeyId: label,
      secretAccessKey: value,
      region: location.value,
    });
    const ec2 = new AWS.EC2();

    let keyPair;
    try {
      const keyPairs = await ec2.describeKeyPairs({ KeyNames: ['nebula'] }).promise();
      keyPair = keyPairs.KeyPairs.find(kp => kp.KeyName === 'nebula');
      if (!keyPair) {
        keyPair = await ec2.createKeyPair({ KeyName: 'nebula' }).promise();
      }
    } catch (error) {
      reject(new Error('Unable to create key pair'));
    }

    let securityGroup;
    try {
      const securityGroups = await ec2.describeSecurityGroups({ GroupNames: ['nebula'] }).promise();

      console.log(securityGroups);
      securityGroup = securityGroups.SecurityGroups.find(sg => sg.GroupName === 'nebula');
      console.log(securityGroup);
      if (!securityGroup) {
        const error = new Error('Security group not found');
        error.status = 404;
        throw error;
      }
    } catch (error) {
      console.log(error);
      if (error.status !== 404 && !/not found/i.test(error)) {
        reject(new Error('Unable to create security group'));
      }

      // create security group (if it doesn't exist)
      securityGroup = await ec2
        .createSecurityGroup({ GroupName: 'nebula', Description: 'Nebula Orion' })
        .promise();

      const securityGroups = await ec2.describeSecurityGroups({ GroupNames: ['nebula'] }).promise();

      securityGroup = securityGroups.SecurityGroups.find(sg => sg.GroupName === 'nebula');

      if (!securityGroup) {
        reject(new Error('Unable to create security group'));
      }

      await ec2
        .authorizeSecurityGroupIngress({
          GroupName: 'nebula',
          IpPermissions: [
            {
              IpProtocol: 'tcp',
              FromPort: 65096,
              ToPort: 65096,
              IpRanges: [{ CidrIp: '0.0.0.0/0' }],
            },
          ],
        })
        .promise();
    }

    try {
      // create instances
      const instances = await ec2
        .runInstances({
          ImageId: 'ami-04169656fea786776', // linux 16.04 LTS (we need to create a mapping of this, cause it changes based on region)
          InstanceType: 't2.nano',
          DryRun: false,
          EbsOptimized: false,
          InstanceInitiatedShutdownBehavior: 'terminate',
          CreditSpecification: { CpuCredits: 'Unlimited' },
          T2T3Unlmited: true,
          KeyName: 'nebula',
          MinCount: proxyOptions.numProxies,
          MaxCount: proxyOptions.numProxies,
          // base64 encoded `bash_script.txt`
          UserData:
            'IyEvYmluL2Jhc2gNCg0KYXB0LWdldCB1cGRhdGUNCg0Kc2xlZXAgMTUNCg0KY2xlYXINCg0KYXB0LWdldCBpbnN0YWxsIHNxdWlkIC15DQphcHQtZ2V0IGluc3RhbGwgYXBhY2hlMi11dGlscyAteQ0KDQpybSAtcmYgL2V0Yy9zcXVpZC9zcXVpZC5jb25mDQoNCnRvdWNoIC9ldGMvc3F1aWQvc3F1aWQuY29uZg0KDQplY2hvIC1lICINCmZvcndhcmRlZF9mb3Igb2ZmDQp2aXNpYmxlX2hvc3RuYW1lIHNxdWlkLnNlcnZlci5jb21tbQ0KDQphdXRoX3BhcmFtIGJhc2ljIHByb2dyYW0gL3Vzci9saWIvc3F1aWQzL2Jhc2ljX25jc2FfYXV0aCAvZXRjL3NxdWlkL3NxdWlkX3Bhc3N3ZA0KYXV0aF9wYXJhbSBiYXNpYyByZWFsbSBwcm94eQ0KYWNsIGF1dGhlbnRpY2F0ZWQgcHJveHlfYXV0aCBSRVFVSVJFRA0KaHR0cF9hY2Nlc3MgYWxsb3cgYXV0aGVudGljYXRlZA0KDQojIENob29zZSB0aGUgcG9ydCB5b3Ugd2FudC4gQmVsb3cgd2Ugc2V0IGl0IHRvIGRlZmF1bHQgMzEyOC4NCmh0dHBfcG9ydCA4MA0KDQpyZXF1ZXN0X2hlYWRlcl9hY2Nlc3MgQWxsb3cgYWxsb3cgYWxsDQpyZXF1ZXN0X2hlYWRlcl9hY2Nlc3MgQXV0aG9yaXphdGlvbiBhbGxvdyBhbGwNCnJlcXVlc3RfaGVhZGVyX2FjY2VzcyBXV1ctQXV0aGVudGljYXRlIGFsbG93IGFsbA0KcmVxdWVzdF9oZWFkZXJfYWNjZXNzIFByb3h5LUF1dGhvcml6YXRpb24gYWxsb3cgYWxsDQpyZXF1ZXN0X2hlYWRlcl9hY2Nlc3MgUHJveHktQXV0aGVudGljYXRlIGFsbG93IGFsbA0KcmVxdWVzdF9oZWFkZXJfYWNjZXNzIENhY2hlLUNvbnRyb2wgYWxsb3cgYWxsDQpyZXF1ZXN0X2hlYWRlcl9hY2Nlc3MgQ29udGVudC1FbmNvZGluZyBhbGxvdyBhbGwNCnJlcXVlc3RfaGVhZGVyX2FjY2VzcyBDb250ZW50LUxlbmd0aCBhbGxvdyBhbGwNCnJlcXVlc3RfaGVhZGVyX2FjY2VzcyBDb250ZW50LVR5cGUgYWxsb3cgYWxsDQpyZXF1ZXN0X2hlYWRlcl9hY2Nlc3MgRGF0ZSBhbGxvdyBhbGwNCnJlcXVlc3RfaGVhZGVyX2FjY2VzcyBFeHBpcmVzIGFsbG93IGFsbA0KcmVxdWVzdF9oZWFkZXJfYWNjZXNzIEhvc3QgYWxsb3cgYWxsDQpyZXF1ZXN0X2hlYWRlcl9hY2Nlc3MgSWYtTW9kaWZpZWQtU2luY2UgYWxsb3cgYWxsDQpyZXF1ZXN0X2hlYWRlcl9hY2Nlc3MgTGFzdC1Nb2RpZmllZCBhbGxvdyBhbGwNCnJlcXVlc3RfaGVhZGVyX2FjY2VzcyBMb2NhdGlvbiBhbGxvdyBhbGwNCnJlcXVlc3RfaGVhZGVyX2FjY2VzcyBQcmFnbWEgYWxsb3cgYWxsDQpyZXF1ZXN0X2hlYWRlcl9hY2Nlc3MgQWNjZXB0IGFsbG93IGFsbA0KcmVxdWVzdF9oZWFkZXJfYWNjZXNzIEFjY2VwdC1DaGFyc2V0IGFsbG93IGFsbA0KcmVxdWVzdF9oZWFkZXJfYWNjZXNzIEFjY2VwdC1FbmNvZGluZyBhbGxvdyBhbGwNCnJlcXVlc3RfaGVhZGVyX2FjY2VzcyBBY2NlcHQtTGFuZ3VhZ2UgYWxsb3cgYWxsDQpyZXF1ZXN0X2hlYWRlcl9hY2Nlc3MgQ29udGVudC1MYW5ndWFnZSBhbGxvdyBhbGwNCnJlcXVlc3RfaGVhZGVyX2FjY2VzcyBNaW1lLVZlcnNpb24gYWxsb3cgYWxsDQpyZXF1ZXN0X2hlYWRlcl9hY2Nlc3MgUmV0cnktQWZ0ZXIgYWxsb3cgYWxsDQpyZXF1ZXN0X2hlYWRlcl9hY2Nlc3MgVGl0bGUgYWxsb3cgYWxsDQpyZXF1ZXN0X2hlYWRlcl9hY2Nlc3MgQ29ubmVjdGlvbiBhbGxvdyBhbGwNCnJlcXVlc3RfaGVhZGVyX2FjY2VzcyBQcm94eS1Db25uZWN0aW9uIGFsbG93IGFsbA0KcmVxdWVzdF9oZWFkZXJfYWNjZXNzIFVzZXItQWdlbnQgYWxsb3cgYWxsDQpyZXF1ZXN0X2hlYWRlcl9hY2Nlc3MgQ29va2llIGFsbG93IGFsbA0KcmVxdWVzdF9oZWFkZXJfYWNjZXNzIEFsbCBkZW55IGFsbCIgPj4gL2V0Yy9zcXVpZC9zcXVpZC5jb25mDQoNCmh0cGFzc3dkIC1iIC1jIC9ldGMvc3F1aWQvc3F1aWRfcGFzc3dkIG5lYnVsYSBuZWJ1bGEgDQoNCnNlcnZpY2Ugc3F1aWQgcmVzdGFydA0KDQpjbGVhcg==',
        })
        .promise();
      if (!instances.Instances.length) {
        reject(new Error('Instances not launched!'));
      }

      const InstanceIds = instances.Instances.map(i => i.InstanceId);

      // wait a few seconds to let the instances start up..

      const availableInstances = await ec2.waitFor('instanceExists', { InstanceIds }).promise();

      if (!availableInstances.Reservations.length) {
        reject(new Error('Instances failed starting'));
      }

      const proxyInstances = await ec2.describeInstances({ InstanceIds }).promise();

      if (!proxyInstances.Reservations.length) {
        reject(new Error('Reservations Not Ready!'));
      }
      const proxies = await proxyInstances.Reservations[0].Instances.map(i => ({
        id: i.InstanceId,
        ip: `${i.PublicIpAddress}:65096`,
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
    const { AWSAccessKey, AWSSecretKey } = awsCredentials;

    if (!AWSAccessKey || !AWSSecretKey) {
      reject(new Error('Invalid Keys'));
    }

    // test the string inputs
    if (regexes.aws_access_key.test(AWSAccessKey) && regexes.aws_secret_key.test(AWSSecretKey)) {
      resolve({ AWSAccessKey, AWSSecretKey });
    } else {
      reject(new Error('Keys should be valid!'));
    }
  });

// Private Actions
const _generateProxies = makeActionCreator(SERVER_ACTIONS.GEN_PROXIES, 'proxyInfo');
const _destroyProxies = makeActionCreator(SERVER_ACTIONS.DESTROY_PROXIES, 'instances');
const _validateAws = makeActionCreator(SERVER_ACTIONS.VALIDATE_AWS, 'response');
const _cleanupStatus = makeActionCreator(SERVER_ACTIONS.CLEANUP_STATUS, 'field');
const _logoutAws = makeActionCreator(SERVER_ACTIONS.LOGOUT_AWS, 'credentials');

// Public Actions
const selectCredentials = makeActionCreator(SERVER_ACTIONS.SELECT, 'credentials');
const handleError = makeActionCreator(SERVER_ACTIONS.ERROR, 'action', 'error');
const editServer = makeActionCreator(SERVER_ACTIONS.EDIT, 'id', 'field', 'value');

const _handleError = (action, error) => async dispatch => {
  dispatch(handleError(action, error));
  await wait(750);
  dispatch(_cleanupStatus(action));
};

// Public Thunks
const generateProxies = (proxyOptions, credentials) => dispatch =>
  _generateProxiesRequest(proxyOptions, credentials).then(
    proxies => dispatch(_generateProxies(proxies)),
    error => dispatch(handleError(SERVER_ACTIONS.GEN_PROXIES, error)),
  );

const destroyProxies = (options, proxies, credentials) => dispatch =>
  _destroyProxiesRequest(options, proxies, credentials).then(
    instances => dispatch(_destroyProxies(instances)),
    error => dispatch(handleError(SERVER_ACTIONS.DESTROY_PROXIES, error)),
  );

const validateAws = awsCredentials => dispatch =>
  _validateAwsRequest(awsCredentials).then(
    response => dispatch(_validateAws(response)),
    async error => {
      dispatch(handleError(SERVER_ACTIONS.VALIDATE_AWS, error));
      await wait(750);
      dispatch(_cleanupStatus(SERVER_ACTIONS.VALIDATE_AWS));
    },
  );

const logoutAws = (proxies, credentials) => dispatch =>
  dispatch(destroyProxies(null, proxies, credentials))
    .catch(async error => {
      console.log('handling error');
      dispatch(handleError(SERVER_ACTIONS.LOGOUT_AWS, error));
      await wait(750);
      dispatch(_cleanupStatus(SERVER_ACTIONS.VALIDATE_AWS));
    })
    .then(() => {
      console.log('logging out...');
      dispatch(_logoutAws(credentials));
    });

export const serverActions = {
  edit: editServer,
  select: selectCredentials,
  error: _handleError,
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
  EDIT_PROXY_CREDENTIALS: 'EDIT_PROXY_CREDENTIALS',
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
