import { RichEmbed, WebhookClient } from 'discord.js';

class Discord {
  constructor(hook) {
    if (hook) {
      const [, , , , , id, token] = hook.split('/');
      this.hook = new WebhookClient(id, token);
    }
  }

  build(success = false, type, checkoutUrl, product, price, store, order, profile, size, image) {
    if (this.hook) {
      const embed = new RichEmbed()
        .setTitle(success ? `Successful checkout (${type})` : `Payment failed! (${type})`)
        .setColor(success ? 4631988 : 15679838)
        .setTimestamp(new Date())
        .setFooter('Nebula Orion © 2019', 'https://imgur.com/4ptVqtH');

      if (image) {
        embed.setThumbnail(image);
      }

      if (product) {
        if (product.url) {
          embed.addField('Product', `[${product.name}](${product.url})`, false);
        } else if (product.name) {
          embed.addField('Product', product.name, false);
        }
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
      return { embed, client: this.hook };
    }
    return null;
  }
}
module.exports = Discord;
