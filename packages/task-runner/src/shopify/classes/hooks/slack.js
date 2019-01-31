const Webhook = require('slack-webhook');

class Slack {
  constructor(hook) {
    this.hook = new Webhook(hook);
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
      return this.hook.send({
        attachments: [
          {
            fallback: success ? 'Successful checkout!' : 'Payment failed!',
            title: success ? 'Successful checkout!' : 'Payment failed!',
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
            footer: 'Nebula Orion @ 2018',
            footer_icon: 'https://pbs.twimg.com/profile_images/997256678650212353/yobeESVF.jpg',
            ts: Math.floor(new Date().getTime() / 1000),
          },
        ],
      });
    }
    return null;
  }
}
module.exports = Slack;
