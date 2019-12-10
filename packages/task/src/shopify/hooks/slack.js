import SlackWebhook from 'slack-webhook';

class Slack {
  constructor(hook) {
    if (hook) {
      this.hook = new SlackWebhook(hook);
    }
  }

  build(success = false, type, checkoutUrl, product, price, store, order, profile, size, image) {
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

      const embed = {
        attachments: [
          {
            fallback,
            title,
            color: success ? '#46ADB4' : '#EF415E',
            fields: [],
            footer: 'Nebula Orion @ 2019',
            footer_icon: 'https://imgur.com/4ptVqtH',
            ts: Math.floor(new Date().getTime() / 1000),
          },
        ],
      };

      if (image) {
        embed.attachments[0].thumb_url = image;
      }

      if (product) {
        if (product.url) {
          embed.attachments[0].fields.push({
            title: 'Product',
            value: `<${product.url}|${product.name}>`,
            short: true,
          });
        } else if (product.name) {
          embed.attachments[0].fields.push({
            title: 'Product',
            value: product.name,
            short: true,
          });
        }
      }

      if (price) {
        embed.attachments[0].fields.push({
          title: 'Price',
          value: price,
          short: true,
        });
      }

      if (store) {
        if (store.url) {
          embed.attachments[0].fields.push({
            title: 'Store',
            value: `<${store.url}|${store.name}>`,
            short: true,
          });
        } else if (store.name) {
          embed.attachments[0].fields.push({
            title: 'Store',
            value: store.name,
            short: true,
          });
        }
      }

      if (order) {
        if (order.url) {
          embed.attachments[0].fields.push({
            title: 'Order #',
            value: `<${order.url}|${order.number}>`,
            short: true,
          });
        } else if (order.number) {
          embed.attachments[0].fields.push({
            title: 'Order #',
            value: order.number,
            short: true,
          });
        }
      }

      if (profile) {
        embed.attachments[0].fields.push({
          title: 'Billing Profile',
          value: profile,
          short: true,
        });
      }

      if (size) {
        embed.attachments[0].fields.push({
          title: 'Size',
          value: size,
          short: true,
        });
      }

      return { embed, client: this.hook };
    }
    return null;
  }
}
module.exports = Slack;
