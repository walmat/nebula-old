const webhook = require('hookcord');

class Discord {
  constructor(hook) {
    if (hook) {
      this.hook = new webhook.Hook().setLink(hook);
    }
  }

  build(
    success = false,
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
  ) {
    if (this.hook) {
      const payload = {
        embeds: [
          {
            title: success ? 'Successful checkout!' : 'Payment failed!',
            color: success ? 4631988 : 15679838,
            thumbnail: {
              url: image,
            },
            fields: [
              {
                name: 'Product',
                value: `[${product.name}](${product.url})`,
                inline: true,
              },
              {
                name: 'Price',
                value: price,
                inline: true,
              },
              {
                name: 'Store',
                value: `[${site.name}](${site.url})`,
                inline: true,
              },
              {
                name: 'Order #',
                value: order ? `[${order.number}](${order.url})` : 'None',
                inline: true,
              },
              {
                name: 'Billing Profile',
                value: profile || 'None',
                inline: true,
              },
              {
                name: 'Size(s)',
                value: `${sizes[0]}`,
                inline: true,
              },
              {
                name: 'Checkout Speed (ms)',
                value: checkoutSpeed,
                inline: true,
              },
              {
                name: 'Shipping Method',
                value: shippingMethod || 'None',
                inline: true,
              },
              {
                name: 'Logger File',
                value: logger || 'None',
                inline: true,
              },
            ],
            footer: {
              icon_url: 'https://pbs.twimg.com/profile_images/997256678650212353/yobeESVF.jpg', // TODO - host our own image
              text: 'Nebula Orion © 2019',
            },
            timestamp: new Date(),
          },
        ],
      };

      return this.hook.setPayload(payload).fire();
    }
    return null;
  }
}
module.exports = Discord;
