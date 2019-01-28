const Discord = require('./discord');
const Slack = require('./slack');

const colors = {
  SUCCESS: '#46ADB4',
  PROCESSING: '#B8D9D2',
  ERROR: '#EF415E',
  WHITE: '#F5F5F5',
};

const notification = (slack, discord, context) => {
  discord.send(
    false,
    context.task.product,
    context.task.size,
    context.task.site,
    new Date(), // todo - calc checkout speed from atc to beginning of this method
    '',
  );
  slack.send(
    false,
    context.task.product,
    context.task.size,
    context.task.site,
    new Date(), // todo - calc checkout speed from atc to beginning of this method
    '',
  );
};

module.exports = {
  colors,
  Discord,
  Slack,
  notification,
};
