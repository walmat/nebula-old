const isDev = require('electron-is-dev');
const Discord = require('./discord');

const notification = async (slack, discord, payload) => {
  const webhook = isDev
    ? 'https://discordapp.com/api/webhooks/492205269942796298/H0giZl0oansmwORuW4ifx-fwKWbcVPXR23FMoWkgrBfIqQErIKBiNQznQIHQuj-EPXic'
    : 'https://discordapp.com/api/webhooks/542618948634542101/U2W9S028eFVJxm40doq4DxMZo1EaLMRZMgrp2nOQoryzG_ysif8fltjhbsPbZSCfzx2J';

  const {
    success,
    type,
    checkoutUrl,
    product,
    price,
    site,
    order,
    profile,
    size,
    shippingMethod,
    image,
  } = payload;

  const promises = [
    await slack.build(
      success,
      type,
      checkoutUrl,
      product,
      price,
      site,
      order,
      profile,
      size,
      shippingMethod,
      image,
    ),
    await discord.build(
      success,
      type,
      checkoutUrl,
      product,
      price,
      site,
      order,
      profile,
      size,
      shippingMethod,
      image,
    ),
  ];

  if (success) {
    promises.push(
      await new Discord(webhook).build(
        success,
        type,
        null, // checkoutUrl
        product,
        price,
        site,
        null, // order
        null, // profile
        size,
        null,
        image,
      ),
    );
  }

  return Promise.all(promises);
};

module.exports = {
  notification,
};
