const Discord = require('./discord');

const notification = async (slack, discord, payload) => {
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
    await new Discord(
      'https://discordapp.com/api/webhooks/542618948634542101/U2W9S028eFVJxm40doq4DxMZo1EaLMRZMgrp2nOQoryzG_ysif8fltjhbsPbZSCfzx2J',
    ).build(
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
