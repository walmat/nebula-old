const { RichEmbed, WebhookClient } = require('discord.js');

const { Platforms } = require('../constants');

class Discord {
  constructor(hook) {
    if (hook) {
      const [, , , , , id, token] = hook.split('/');
      this.hook = new WebhookClient(id, token);
    }
  }

  async build(platform, payload) {
    if (this.hook) {
      const { title, success } = payload;
      // base embed for all platforms
      const embed = new RichEmbed()
        .setTitle(title)
        .setColor(success ? 4631988 : 15679838)
        .setThumbnail(payload.image)
        .setTimestamp(new Date())
        .setFooter(
          'Nebula Orion © 2019',
          'https://pbs.twimg.com/profile_images/1133844004141961216/rZL94TBk_400x400.png',
        );

      switch (platform) {
        case Platforms.Shopify: {
          const { product, price, store, order, profile, size, speed, shipping, proxies } = payload;
          embed
            .addField('Product', [product.name](product.url))
            .addField('Price', price, true)
            .addField('Store', [store.name](store.url));

          // sensitive data
          if (order) {
            embed.addField('Order', [order.number](order.url));
            embed.setURL(order.url);
          }

          // sensitive data
          if (profile) {
            embed.addField('Profile', profile, true);
          }

          embed.addField('Size', size, true).addField('Speed (ms)', speed, true);

          // sensitive data
          if (shipping) {
            embed.addField('Shipping Method', shipping, true);
          }

          embed.addField('# Proxies', proxies.length);
          break;
        }
        case Platforms.Supreme: {
          const { product, price, store, profile, size, proxies } = payload;
          embed
            .addField('Product', [product.name](product.url))
            .addField('Price', price, true)
            .addField('Store', [store.name](store.url));

          if (profile) {
            embed.addField('Profile', profile, true);
          }

          embed.addField('Size', size, true);
          embed.addField('# Proxies', proxies.length);
          break;
        }
        case Platforms.Footsites: {
          break;
        }
        case Platforms.Mesh: {
          break;
        }
        default:
          break;
      }
    }
    return null;
  }
}

module.exports = Discord;
