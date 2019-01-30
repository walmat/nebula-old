const Discord = require('./discord');
const Slack = require('./slack');

const colors = {
<<<<<<< HEAD
  SUCCESS: '4631988',
  ERROR: '15679838',
};

const notification = (slack, discord, success, context) => {
  discord.send(
    success,
=======
  SUCCESS: '#46ADB4',
  PROCESSING: '#B8D9D2',
  ERROR: '#EF415E',
  WHITE: '#F5F5F5',
};

const notification = (slack, discord, context) => {
  discord.send(
    false,
>>>>>>> e4207718a6d1f99f753e27cc46d6e0d98c708f7e
    context.task.product,
    context.task.size,
    context.task.site,
    new Date(), // todo - calc checkout speed from atc to beginning of this method
    '',
  );
  slack.send(
<<<<<<< HEAD
    success,
=======
    false,
>>>>>>> e4207718a6d1f99f753e27cc46d6e0d98c708f7e
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
