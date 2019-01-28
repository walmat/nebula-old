const ProxyManager = require('./proxyManager');
const aws = require('./providers/aws');
const gcloud = require('./providers/gcloud');
const vultr = require('./providers/vultr');
const dgOcean = require('./providers/dgOcean');
const upcloud = require('./providers/upcloud');
const linode = require('./providers/linode');
const atlantic = require('./providers/atlantic');
const oneHundredTB = require('./providers/oneHundredTB');
const vpsie = require('./providers/vpsie');

const Events = {
  StartGenerate: 'START_GENERATE',
  StopGenerate: 'STOP_GENERATE',
};

module.exports = {
  providers: {
    atlantic,
    aws,
    dgOcean,
    gcloud,
    linode,
    oneHundredTB,
    upcloud,
    vpsie,
    vultr,
  },
  ProxyManager,
  Events,
};
