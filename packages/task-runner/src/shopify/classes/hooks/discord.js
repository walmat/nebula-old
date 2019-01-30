const webhook = require('hookcord');
const { colors } = require('./index');

class Discord {
  constructor(hook) {
    this.hook = new webhook.Hook().setLink(hook);
  }

  send(
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
            color: success ? colors.SUCCESS : colors.ERROR,
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
                value: `[${order.number}](${order.url})`,
                inline: true,
              },
              {
                name: 'Billing Profile',
                value: profile,
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
                value: shippingMethod,
                inline: true,
              },
              {
                name: 'Logger File',
                value: logger,
                inline: true,
              },
            ],
            footer: {
              icon_url: 'https://pbs.twimg.com/profile_images/997256678650212353/yobeESVF.jpg',
              text: 'Nebula Orion © 2018',
            },
          },
        ],
      };

      return this.hook.setPayload(payload).fire();
    }
    return null;
  }
}
module.exports = Discord;
