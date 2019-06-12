const { EC2, Config } = require('aws-sdk');
const Provider = require('../index');
const regionAMIMap = require('./amiMap');
/**
 * Super class for shared variables / methods between providers
 */
class AWS extends Provider {
  constructor(id, data) {
    super(id, data);
    this.credentials = data.credentials;
    this.number = data.number;
    this.location = data.location;
    this.username = data.username;
    this.password = data.password;
    this.AWS = new Config({
      accessKeyId: data.credentials.AWSAccessKey,
      secretAccessKey: data.credentials.AWSSecretKey,
      region: data.location,
    });

    this.ec2 = new EC2();

    this.keyPair = null;
    this.securityGroup = null;
    this.instanceIds = [];
    this.instances = [];
  }

  async keyPair() {
    try {
      const keyPairs = await this.ec2.describeKeyPairs({ KeyNames: ['nebula'] }).promise();
      this.keyPair = keyPairs.KeyPairs.find(kp => kp.KeyName === 'nebula');

      if (!this.keyPair) {
        this.keyPair = await this.ec2.createKeyPair({ KeyName: 'nebula' }).promise();
      }
    } catch (error) {
      throw new Error('Unable to create key pair');
    }
  }

  async securityGroup() {
    try {
      const securityGroups = await this.ec2
        .describeSecurityGroups({ GroupNames: ['nebula'] })
        .promise();

      this.securityGroup = securityGroups.SecurityGroups.find(sg => sg.GroupName === 'nebula');
      if (!this.securityGroup) {
        const error = new Error('Security group not found');
        error.status = 404;
        throw error;
      }
    } catch (error) {
      if (error.status !== 404 && !/not found/i.test(error)) {
        throw new Error('Unable to create security group');
      }
      await this.ec2
        .createSecurityGroup({ GroupName: 'nebula', Description: 'Nebula Orion' })
        .promise();

      const securityGroups = await this.ec2
        .describeSecurityGroups({ GroupNames: ['nebula'] })
        .promise();

      this.securityGroup = securityGroups.SecurityGroups.find(sg => sg.GroupName === 'nebula');
      if (!this.securityGroup) {
        throw new Error('Unable to create security group');
      }

      await this.ec2
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
  }

  async create() {
    try {
      const instances = await this.ec2
        .runInstances({
          ImageId: regionAMIMap[this.location],
          InstanceType: 't2.nano',
          DryRun: false,
          EbsOptimized: false,
          InstanceInitiatedShutdownBehavior: 'terminate',
          CreditSpecification: { CpuCredits: 'Unlimited' },
          KeyName: 'nebula',
          MinCount: number,
          MaxCount: number,
          Monitoring: {
            Enabled: false,
          },
          SecurityGroups: ['nebula'],
          UserData: Buffer.from(
            `
          #!/bin/bash

          yum update -y
          yum install squid3 apache2-utils -y

          rm -rf /etc/squid3/squid.conf
          touch /etc/squid3/squid.conf

          echo -e "
          forwarded_for off
          visible_hostname squid.server.commm

          auth_param basic program /usr/lib/squid3/basic_ncsa_auth /etc/squid3/squid_passwd
          auth_param basic realm proxy
          acl authenticated proxy_auth REQUIRED
          http_access allow authenticated

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
          request_header_access All deny all" >> /etc/squid3/squid.conf

          htpasswd -b -c /etc/squid3/squid_passwd ${this.username} ${this.password}

          service squid restart`,
          ).toString('base64'),
        })
        .promise();

      if (!instances.Instances.length) {
        throw new Error('Instances not launched');
      }

      this.InstanceIds = instances.Instances.map(i => i.InstanceId);

      const availableInstances = await this.ec2
        .waitFor('instanceExists', { InstanceIds: this.InstanceIds })
        .promise();

      if (!availableInstances.Reservations.length) {
        throw new Error('No instances running');
      }

      const proxyInstances = await this.ec2
        .describeInstances({ InstanceIds: this.InstanceIds })
        .promise();

      if (!proxyInstances.Reservations.length) {
        throw new Error('No instances running');
      }

      this.instances = await proxyInstances.Reservations[0].Instances.map(i => ({
        id: i.InstanceId,
        ip: `${i.PublicIpAddress}:65096:${this.username}:${this.password}`,
      }));
    } catch (error) {
      throw error;
    }
  }

  start() {}

  stop() {}

  terminate() {}
}
module.exports = AWS;
