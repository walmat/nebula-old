const notification = async (slack, discord, payload) => {
  const {
    success,
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
    await discord.build(
      success,
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
    await slack.build(
      success,
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
  ];

  return Promise.all(promises);
};

module.exports = {
  notification,
};
