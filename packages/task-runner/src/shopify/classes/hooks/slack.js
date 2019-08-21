const Webhook = require('slack-webhook');

class Slack {
  constructor(hook) {
    if (hook) {
      this.hook = new Webhook(hook);
    }
  }

  async build(
    success = false,
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
  ) {
    if (this.hook) {
      const payload = {
        attachments: [
          {
            fallback: success ? `Successful checkout (${type})` : `Payment failed! (${type})`,
            title: success ? `Successful checkout (${type})` : `Payment failed! (${type})`,
            color: success ? '#46ADB4' : '#EF415E',
            fields: [
              {
                title: 'Product',
                value: `<${product.url}|${product.name}>`,
                short: true,
              },
              {
                title: 'Price',
                value: price,
                short: true,
              },
              {
                title: 'Store',
                value: `<${site.url}|${site.name}>`,
                short: true,
              },
              {
                title: 'Order #',
                value: `<${order.url}|${order.number}>`,
                short: true,
              },
              {
                title: 'Billing Profile',
                value: profile,
                short: true,
              },
              {
                title: 'Size(s)',
                value: sizes[0],
                short: true,
              },
              {
                title: 'Checkout Time (ms)',
                value: checkoutSpeed,
                short: true,
              },
              {
                title: 'Shipping Method',
                value: shippingMethod,
                short: true,
              },
              {
                title: 'Logger File',
                value: logger,
                short: true,
              },
            ],
            thumb_url: image,
            footer: 'Nebula Orion @ 2019',
            footer_icon: 'https://pbs.twimg.com/profile_images/997256678650212353/yobeESVF.jpg', // TODO - host our own image
            ts: Math.floor(new Date().getTime() / 1000),
          },
        ],
      };
      return this.hook.send(payload);
    }
    return null;
  }
}
module.exports = Slack;
