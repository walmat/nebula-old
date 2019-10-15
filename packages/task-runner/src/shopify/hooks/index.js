import isDev from 'electron-is-dev';
import Discord from './discord';
import Slack from './slack';

export default async (slack, discord, payload) => {
  const webhook = isDev
    ? 'https://discordapp.com/api/webhooks/492205269942796298/H0giZl0oansmwORuW4ifx-fwKWbcVPXR23FMoWkgrBfIqQErIKBiNQznQIHQuj-EPXic'
    : 'https://discordapp.com/api/webhooks/542618948634542101/U2W9S028eFVJxm40doq4DxMZo1EaLMRZMgrp2nOQoryzG_ysif8fltjhbsPbZSCfzx2J';

  const { success, type, checkoutUrl, product, price, site, order, profile, size, image } = payload;

  const hooks = [
    slack.build(success, type, checkoutUrl, product, price, site, order, profile, size, image),
    discord.build(success, type, checkoutUrl, product, price, site, order, profile, size, image),
  ];

  // #checkout-log
  if (success) {
    hooks.push(
      new Discord(webhook).build(
        success,
        type,
        null, // checkoutUrl
        product,
        price,
        site,
        null, // order
        null, // profile
        size,
        image,
      ),
    );
  }

  return hooks;
};

export { Discord, Slack };
