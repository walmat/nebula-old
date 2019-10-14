import isDev from 'electron-is-dev';
import Discord from './discord';

const notification = async (slack, discord, payload) => {
  const webhook = isDev
    ? 'https://discordapp.com/api/webhooks/492205269942796298/H0giZl0oansmwORuW4ifx-fwKWbcVPXR23FMoWkgrBfIqQErIKBiNQznQIHQuj-EPXic'
    : 'https://discordapp.com/api/webhooks/542618948634542101/U2W9S028eFVJxm40doq4DxMZo1EaLMRZMgrp2nOQoryzG_ysif8fltjhbsPbZSCfzx2J';

  const { success, product, price, site, profile, size, image } = payload;

  const hooks = [
    slack.build(success, product, price, site, profile, size, image),
    discord.build(success, product, price, site, profile, size, image),
  ];

  // #checkout-log
  if (success) {
    hooks.push(
      new Discord(webhook).build(
        success,
        product,
        price,
        site,
        null, // profile
        size,
        image,
      ),
    );
  }

  return hooks;
};

module.exports = {
  notification,
};
