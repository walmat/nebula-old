const Discord = require('./discord');
const isDev = require('electron-is-dev');

const notification = async (slack, discord, payload) => {
  
  const webhook = isDev ? 'https://discordapp.com/api/webhooks/492205269942796298/H0giZl0oansmwORuW4ifx-fwKWbcVPXR23FMoWkgrBfIqQErIKBiNQznQIHQuj-EPXic' : 'https://discordapp.com/api/webhooks/542618948634542101/U2W9S028eFVJxm40doq4DxMZo1EaLMRZMgrp2nOQoryzG_ysif8fltjhbsPbZSCfzx2J';
  
  const {
    success,
    type,
    product,
    price,
    site,
    order,
    profile,
    sizes,
    checkoutSpeed,
    shippingMethod,
    logger,
    image,
  } = payload;

  const promises = [
    await slack.build(
      success,
      type,
      product,
      price,
      site,
      order,
      profile,
      sizes,
      checkoutSpeed,
      shippingMethod,
      logger,
      image,
    ),
    await discord.build(
      success,
      type,
      product,
      price,
      site,
      order,
      profile,
      sizes,
      checkoutSpeed,
      shippingMethod,
      logger,
      image,
    ),
    await new Discord(webhook).build(
      success,
      type,
      product,
      price,
      site,
      null,
      null,
      sizes,
      checkoutSpeed,
      null,
      null,
      image,
    ),
  ];

  return Promise.all(promises);
};

module.exports = {
  notification,
};
