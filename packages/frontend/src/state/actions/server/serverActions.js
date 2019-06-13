import AWS from 'aws-sdk';

import makeActionCreator from '../actionCreator';
import regexes from '../../../utils/validation';
import amiMapping from '../../../constants/amiMapping';

// Top level Actions
export const SERVER_ACTIONS = {
  EDIT: 'EDIT',
  SELECT: 'SELECT',
  ERROR: 'SERVER_HANDLE_ERROR',
  GEN_PROXIES: 'GENERATE_PROXIES',
  DESTROY_PROXIES: 'DESTROY_PROXIES',
  VALIDATE_AWS: 'VALIDATE_AWS_CREDENTIALS',
  LOGOUT_AWS: 'LOGOUT_AWS',
};

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const _buildDestroyProxiesPromises = (options, proxies, credentials) =>
  proxies.map(proxy => {
    console.log('SERVER: proxy object: %j', proxy);
    if (!options || proxy.region === options.location.value) {
      console.log(credentials);
      AWS.config = new AWS.Config({
        accessKeyId: credentials.label,
        secretAccessKey: credentials.value,
        region: proxy.region,
      });
      const ec2 = new AWS.EC2({ apiVersion: '2016-11-15' });
      const InstanceIds = proxy.proxies.map(p => p.id);
      console.log('SERVER: proxy instanceIds: %j', InstanceIds);
      return { InstanceIds, promises: ec2.terminateInstances({ InstanceIds }).promise() };
    }
    return {
      promises: [new Promise((_, reject) => reject(new Error('No Proxies For Region')))],
    };
  });

const _getKeyPair = async (access, secret, region) => {
  AWS.config = new AWS.Config({
    accessKeyId: access,
    secretAccessKey: secret,
    region,
  });
  const ec2 = new AWS.EC2({ apiVersion: '2016-11-15' });

  let keyPair;
  try {
    const keyPairs = await ec2.describeKeyPairs({ KeyNames: ['nebula'] }).promise();
    keyPair = keyPairs.KeyPairs.find(kp => kp.KeyName === 'nebula');
    if (!keyPair) {
      keyPair = await ec2.createKeyPair({ KeyName: 'nebula' }).promise();
    }
    return keyPair;
  } catch (error) {
    throw new Error('Unable to create key pair');
  }
};

const _getSecurityGroup = async (access, secret, region, name) => {
  AWS.config = new AWS.Config({
    accessKeyId: access,
    secretAccessKey: secret,
    region,
  });
  const ec2 = new AWS.EC2({ apiVersion: '2016-11-15' });

  let securityGroup;
  try {
    const securityGroups = await ec2.describeSecurityGroups({ GroupNames: [name] }).promise();

    console.log(securityGroups);
    securityGroup = securityGroups.SecurityGroups.find(sg => sg.GroupName === name);
    console.log(securityGroup);
    if (!securityGroup) {
      const error = new Error('Security group not found');
      error.status = 404;
      throw error;
    }
    return securityGroup;
  } catch (error) {
    console.log(error);
    if (error.status !== 404 && !/not found/i.test(error)) {
      throw new Error('Unable to create security group');
    }

    // create security group (if it doesn't exist)
    securityGroup = await ec2
      .createSecurityGroup({ GroupName: name, Description: 'Nebula Orion' })
      .promise();

    const securityGroups = await ec2.describeSecurityGroups({ GroupNames: [name] }).promise();

    securityGroup = securityGroups.SecurityGroups.find(sg => sg.GroupName === name);

    if (!securityGroup) {
      throw new Error('Unable to create security group');
    }

    await ec2
      .authorizeSecurityGroupIngress({
        GroupName: name,
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
    return securityGroup;
  }
};

const _createInstances = async (
  access,
  secret,
  number,
  region,
  username,
  password,
  keyPair,
  securityGroup,
) => {
  AWS.config = new AWS.Config({
    accessKeyId: access,
    secretAccessKey: secret,
    region,
  });
  const ec2 = new AWS.EC2({ apiVersion: '2016-11-15' });

  let instances;

  try {
    const ImageId = amiMapping[region];

    if (!ImageId) {
      throw new Error('Region not supported!');
    }

    const UserData = Buffer.from(
      `
#!/bin/bash

apt-get update

sleep 15

apt-get install squid -y
apt-get install apache2-utils -y

rm -rf /etc/squid/squid.conf
touch /etc/squid/squid.conf

echo -e '
forwarded_for off
visible_hostname squid.server.commm

auth_param basic program /usr/lib/squid/basic_ncsa_auth /etc/squid/squid_passwd
auth_param basic realm proxy
acl authenticated proxy_auth REQUIRED
http_access allow authenticated

# Choose the port you want. Below we set it to default 3128.
http_port 65096

request_header_access Allow allow all
request_header_access Authorization allow all
request_header_access WWW-Authenticate allow all
request_header_access Proxy-Authorization allow all
request_header_access Proxy-Authenticate allow all
request_header_access Cache-Control allow all
request_header_access Content-Encoding allow all
request_header_access Content-Length allow all
request_header_access Content-Type allow all
request_header_access Date allow all
request_header_access Expires allow all
request_header_access Host allow all
request_header_access If-Modified-Since allow all
request_header_access Last-Modified allow all
request_header_access Location allow all
request_header_access Pragma allow all
request_header_access Accept allow all
request_header_access Accept-Charset allow all
request_header_access Accept-Encoding allow all
request_header_access Accept-Language allow all
request_header_access Content-Language allow all
request_header_access Mime-Version allow all
request_header_access Retry-After allow all
request_header_access Title allow all
request_header_access Connection allow all
request_header_access Proxy-Connection allow all
request_header_access User-Agent allow all
request_header_access Cookie allow all
request_header_access All deny all' > /etc/squid/squid.conf

htpasswd -b -c /etc/squid/squid_passwd ${username} ${password}

service squid restart
    `,
    ).toString('base64');

    // create instances
    const createdInstances = await ec2
      .runInstances({
        ImageId,
        InstanceType: 't2.nano',
        DryRun: false,
        EbsOptimized: false,
        InstanceInitiatedShutdownBehavior: 'terminate',
        CreditSpecification: { CpuCredits: 'Unlimited' },
        KeyName: keyPair.KeyName,
        MinCount: 1,
        MaxCount: number,
        Monitoring: {
          Enabled: false,
        },
        SecurityGroups: [securityGroup.GroupName],
        UserData,
      })
      .promise();
    if (!createdInstances.Instances.length) {
      throw new Error('No new instances launched!');
    }

    const InstanceIds = createdInstances.Instances.map(i => i.InstanceId);

    // wait a few seconds to let the instances start up..

    const availableInstances = await ec2.waitFor('instanceExists', { InstanceIds }).promise();

    if (!availableInstances.Reservations.length) {
      throw new Error('Instances not reserved');
    }

    const proxyInstances = await ec2.describeInstances({ InstanceIds }).promise();

    if (!proxyInstances.Reservations.length) {
      throw new Error('Instances not reserved');
    }
    const proxies = await proxyInstances.Reservations[0].Instances.map(i => ({
      id: i.InstanceId,
      proxy: `${i.PublicIpAddress}:65096:${username}:${password}`,
      credentials: { AWSAccessKey: access, AWSSecretKey: secret },
      region,
      charges: 0,
      status: i.State.Name,
      speed: null,
    }));

    console.log(proxies);

    return proxies;
  } catch (err) {
    throw new Error(err.message || 'No instances available');
  }
};

const _generateProxiesRequest = async (proxyOptions, credentials) =>
  new Promise(async (resolve, reject) => {
    if (
      !credentials ||
      ((credentials && !credentials.label) || (credentials && !credentials.value))
    ) {
      reject(new Error('No credentials provided!'));
    }

    const { label, value } = credentials;

    const { number, location, username, password } = proxyOptions;
    // setup & config
    let keyPair;
    try {
      keyPair = await _getKeyPair(label, value, location.value);
    } catch (err) {
      throw new Error(err.message || 'Unable to create keypair');
    }

    let securityGroup;
    try {
      securityGroup = await _getSecurityGroup(label, value, location.value, 'nebula');
    } catch (err) {
      throw new Error(err.message || 'Unable to create security group');
    }

    let instances;
    try {
      instances = await _createInstances(
        label,
        value,
        number,
        location.value,
        username,
        password,
        keyPair,
        securityGroup,
      );
    } catch (err) {
      throw new Error(err.message || 'Unable to create instances');
    }
    resolve(instances);
  });

const _destroyProxiesRequest = async (options, proxies, credentials) => {
  const { InstanceIds, promises } = _buildDestroyProxiesPromises(options, proxies, credentials);
  console.log(promises);
  return new Promise(async (resolve, reject) => {
    if (!promises || !promises.length) {
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
        if (/not exist/i.test(err)) {
          resolve(InstanceIds);
        }
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
const _generateProxies = makeActionCreator(SERVER_ACTIONS.GEN_PROXIES, 'response');
const _destroyProxies = makeActionCreator(SERVER_ACTIONS.DESTROY_PROXIES, 'instances');
const _validateAws = makeActionCreator(SERVER_ACTIONS.VALIDATE_AWS, 'response');
const _logoutAws = makeActionCreator(SERVER_ACTIONS.LOGOUT_AWS, 'credentials');

// Public Actions
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
    proxies => dispatch(_generateProxies(proxies)),
    async error => {
      dispatch(handleError(SERVER_ACTIONS.GEN_PROXIES, error, false));
      await wait(750);
      dispatch(handleError(SERVER_ACTIONS.GEN_PROXIES, error, true));
    },
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
      dispatch(handleError(SERVER_ACTIONS.VALIDATE_AWS, error, false));
      await wait(750);
      dispatch(handleError(SERVER_ACTIONS.VALIDATE_AWS, error, true));
    },
  );

const logoutAws = (proxies, credentials) => dispatch =>
  dispatch(destroyProxies(null, proxies, credentials))
    .catch(async error => {
      dispatch(handleError(SERVER_ACTIONS.LOGOUT_AWS, error, false));
      await wait(750);
      dispatch(handleError(SERVER_ACTIONS.VALIDATE_AWS, error, true));
    })
    .then(() => {
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
