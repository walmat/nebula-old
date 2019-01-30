const Discord = require('./discord');
const Slack = require('./slack');

const colors = {
  SUCCESS: '4631988',
  ERROR: '15679838',
};

const notification = (slack, discord, success, context) => {
  discord.send(
    success,
    context.task.product,
    context.task.size,
    context.task.site,
    new Date(), // todo - calc checkout speed from atc to beginning of this method
    '',
  );
  slack.send(
    success,
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
