const ProxyManager = require('./proxyManager');
const AWS = require('./providers/aws');
const Gcloud = require('./providers/gcloud');
const Vultr = require('./providers/vultr');
const Dgocean = require('./providers/dgOcean');
const Upcloud = require('./providers/upcloud');
const Linode = require('./providers/linode');
const Atlantic = require('./providers/atlantic');
const oneHundredTB = require('./providers/oneHundredTB');
const Vpsie = require('./providers/vpsie');

const Events = {
  START: 'START',
  STOP: 'STOP',
  ABORT: 'ABORT',
};

const Types = {
  AWS: 'AWS',
  ATL: 'ATLANTIC',
  DGO: 'DIGITAL_OCEAN',
  GCP: 'GOOGLE_CLOUD_PROXY',
  LIN: 'LINODE',
  OHT: 'ONE_HUNDRED_TB',
  UPC: 'UPCLOUD',
  VPS: 'VPSIE',
  VUL: 'VULTR',
};

module.exports = {
  Providers: {
    Atlantic,
    AWS,
    Dgocean,
    Gcloud,
    Linode,
    oneHundredTB,
    Upcloud,
    Vpsie,
    Vultr,
  },
  ProxyManager,
  Events,
  Types,
};
