import SlackWebhook from 'slack-webhook';

export default class Slack {
  constructor(url) {
    if (url) {
      this.client = new SlackWebhook(url);
    }
  }

  build({
    success = false,
    type,
    checkoutUrl,
    product,
    price,
    store,
    order,
    profile,
    size,
    image,
  }) {
    if (this.client) {
      let title;

      switch (success) {
        case true: {
          // this will only happen for Shopify
          if (checkoutUrl) {
            title = `<Successful checkout (${type})|${checkoutUrl}>`;
          }
          title = type ? `Successful checkout (${type})` : 'Successful checkout';
          break;
        }
        default: {
          if (checkoutUrl) {
            title = `<Payment failed! (${type})|${checkoutUrl}>`;
          }
          title = type ? `Payment failed! (${type})` : 'Payment failed';
          break;
        }
      }

      const embed = {
        attachments: [
          {
            title,
            color: success ? '#46ADB4' : '#EF415E',
            fields: [],
            footer: 'Nebula @ 2020',
            footer_icon: 'https://i.ibb.co/1dqVb6k/logo.png',
            ts: Math.floor(new Date().getTime() / 1000),
          },
        ],
      };

      if (image) {
        embed.attachments[0].thumb_url = image;
      }

      if (product) {
        if (product.url && product.name) {
          embed.attachments[0].fields.push({
            title: 'Product',
            value: `<${product.url}|${product.name}>`,
            short: true,
          });
        } else {
          embed.attachments[0].fields.push({
            title: 'Product',
            value: product,
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
        embed.attachments[0].push({
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

      return embed;
    }
    return null;
  }

  send(embed) {
    this.client.send(embed);
  }
}
