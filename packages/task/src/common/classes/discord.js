import { RichEmbed, WebhookClient } from 'discord.js';

export default class Discord {
  constructor(url) {
    if (url) {
      const [, , , , , id, token] = url.split('/');
      this.client = new WebhookClient(id, token);
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
      const embed = new RichEmbed()
        .setColor(success ? 4631988 : 15679838)
        .setTimestamp(new Date())
        .setFooter('Nebula © 2019', 'https://i.ibb.co/1dqVb6k/logo.png');

      if (type) {
        embed.setTitle(success ? `Successful checkout (${type})` : `Payment failed! (${type})`);
      } else {
        embed.setTitle(success ? 'Successful checkout!' : 'Payment failed!');
      }

      if (image) {
        embed.setThumbnail(image);
      }

      if (product) {
        embed.addField('Product', product, false);
      }

      if (price) {
        embed.addField('Price', price, true);
      }

      if (store) {
        if (store.url) {
          embed.addField('Store', `[${store.name}](${store.url})`, true);
        } else if (store.name) {
          embed.addField('Store', store.name, true);
        }
      }

      if (order && order.number && order.url) {
        embed.addField('Order #', `[${order.number}](${order.url})`, true);
        embed.setURL(order.url);
      }

      if (profile) {
        embed.addField('Billing Profile', `${profile}`, true);
      }

      embed.addField('Size', size, true);

      if (checkoutUrl) {
        embed.setURL(checkoutUrl);
      }

      return embed;
    }
    return null;
  }

  send(embed) {
    this.client.send(embed);
  }
}
