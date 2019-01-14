const Discord = require('./discord');
const Slack = require('./slack');

// shared import point for the two notification subclasses
module.exports = {
  Discord,
  Slack,
};
