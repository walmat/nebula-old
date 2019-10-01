const { RichEmbed, WebhookClient } = require('discord.js');

class Discord {
  constructor(hook) {
    if (hook) {
      const [, , , , , id, token] = hook.split('/');
      this.hook = new WebhookClient(id, token);
    }
  }

  build(success = false, type, checkoutUrl, product, price, site, order, profile, size, image) {
    if (this.hook) {
      const embed = new RichEmbed()
        .setTitle(success ? `Successful checkout (${type})` : `Payment failed! (${type})`)
        .setColor(success ? 4631988 : 15679838)
        .setThumbnail(image)
        .setTimestamp(new Date())
        .addField('Product', `[${product.name}](${product.url})`, false)
        .addField('Price', `${price}`, true)
        .addField('Store', `[${site.name}](${site.url})`, true)
        .setFooter(
          'Nebula Orion © 2019',
          'https://pbs.twimg.com/profile_images/1133844004141961216/rZL94TBk_400x400.png',
        );

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
