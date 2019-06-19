import AWS from 'aws-sdk';
import amiMapping from '../../../constants/amiMapping';

export const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export const _getSecurityGroup = async (access, secret, region, name) => {
  AWS.config = new AWS.Config({
    accessKeyId: access,
    secretAccessKey: secret,
    region,
  });
  const ec2 = new AWS.EC2({ apiVersion: '2016-11-15' });

  let securityGroup;
  try {
    const securityGroups = await ec2.describeSecurityGroups({ GroupNames: [name] }).promise();

    securityGroup = securityGroups.SecurityGroups.find(sg => sg.GroupName === name);
    if (!securityGroup) {
      const error = new Error('Security group not found');
      error.status = 404;
      throw error;
    }
    return securityGroup;
  } catch (error) {
    if (error.status !== 404 && !/not exist/i.test(error)) {
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

export const _waitUntilRunning = async (options, instances, credentials) =>
  new Promise(async (resolve, reject) => {
    const { AWSAccessKey: accessKeyId, AWSSecretKey: secretAccessKey } = credentials;

    const {
      location: { value: region },
      username,
      password,
    } = options;

    AWS.config = new AWS.Config({
      accessKeyId,
      secretAccessKey,
      region,
    });
    const ec2 = new AWS.EC2({ apiVersion: '2016-11-15' });

    const InstanceIds = instances.map(i => i.id);

    const proxyInstances = await ec2.waitFor('instanceRunning', { InstanceIds }).promise();

    if (!proxyInstances.Reservations.length) {
      return reject(new Error('Instances not reserved'));
    }

    const proxies = await proxyInstances.Reservations[0].Instances.map(i => ({
      id: i.InstanceId,
      proxy: i.PublicIpAddress ? `${i.PublicIpAddress}:65096:${username}:${password}` : null,
      credentials: { AWSAccessKey: accessKeyId, AWSSecretKey: secretAccessKey },
      region: options.location.value,
      charges: 0,
      status: i.State.Name,
      speed: null,
    }));

    return resolve(proxies);
  });

export const _waitUntilTerminated = async (options, instances, credentials) =>
  new Promise(async (resolve, reject) => {
    const { AWSAccessKey: accessKeyId, AWSSecretKey: secretAccessKey } = credentials;

    const {
      location: { value: region },
    } = options;

    AWS.config = new AWS.Config({
      accessKeyId,
      secretAccessKey,
      region,
    });

    const InstanceIds = instances.map(i => i.id);

    const ec2 = new AWS.EC2({ apiVersion: '2016-11-15' });
    let proxyInstances = null;
    try {
      proxyInstances = await ec2.waitFor('instanceTerminated', { InstanceIds }).promise();
    } catch (error) {
      console.log(error);
      if (/not in state/i.test(error)) {
        return resolve(instances);
      }
    }

    if (!proxyInstances) {
      return resolve(instances);
    }

    if (!proxyInstances.Reservations.length) {
      return reject(new Error('Instances not terminated'));
    }

    return resolve(instances);
  });

export const _createInstances = async (
  access,
  secret,
  number,
  region,
  username,
  password,
  securityGroup,
) => {
  AWS.config = new AWS.Config({
    accessKeyId: access,
    secretAccessKey: secret,
    region,
  });
  const ec2 = new AWS.EC2({ apiVersion: '2016-11-15' });

  try {
    const ImageId = amiMapping[region];

    if (!ImageId) {
      throw new Error('Region not supported!');
    }

    const UserData = Buffer.from(
      `#!/bin/bash

  apt-get update

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

  service squid restart`,
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
      proxy: i.PublicIpAddress ? `${i.PublicIpAddress}:65096:${username}:${password}` : null,
      credentials: { AWSAccessKey: access, AWSSecretKey: secret },
      region,
      charges: 0,
      status: i.State.Name,
      speed: null,
    }));

    return proxies;
  } catch (err) {
    throw new Error(err.message || 'No instances available');
  }
};
