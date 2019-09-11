// Main entry point in the Task Runner
const logger = require('./common/logger');
const shopify = require('./shopify');
const mesh = require('./mesh');
const supreme = require('./supreme');
const footsites = require('./footsites');

module.exports = {
  logger,
  shopify,
  mesh,
  supreme,
  footsites,
};
