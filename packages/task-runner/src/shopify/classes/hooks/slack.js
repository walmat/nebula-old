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
    checkoutUrl,
    product,
    price,
    site,
    order,
    profile,
    sizes,
    checkoutSpeed,
    shippingMethod,
    image,
  ) {
    if (this.hook) {
      let fallback;
      let title;

      switch (success) {
        case true: {
          if (checkoutUrl) {
            fallback = `<Successful checkout (${type})|${checkoutUrl}>`;
            title = `<Successful checkout (${type})|${checkoutUrl}>`;
          }
          fallback = `Successful checkout (${type})`;
          title = `Successful checkout (${type})`;
          break;
        }
        default: {
          if (checkoutUrl) {
            fallback = `<Payment failed! (${type})|${checkoutUrl}>`;
            title = `<Payment failed! (${type})|${checkoutUrl}>`;
          }
          fallback = `Payment failed! (${type})`;
          title = `Payment failed! (${type})`;
          break;
        }
      }

      const payload = {
        attachments: [
          {
            fallback,
            title,
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
                value: order ? `<${order.url}|${order.number}>` : 'None',
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
            ],
            thumb_url: image,
            footer: 'Nebula Orion @ 2019',
            footer_icon:
              'https://pbs.twimg.com/profile_images/1133844004141961216/rZL94TBk_400x400.png',
            ts: Math.floor(new Date().getTime() / 1000),
          },
        ],
      };

      console.log(payload);
      return this.hook.send(payload);
    }
    return null;
  }
}
module.exports = Slack;
