import { RichEmbed, WebhookClient } from 'discord.js';

export default class Discord {
  constructor(hook) {
    if (hook) {
      const [, , , , , id, token] = hook.split('/');
      this.hook = new WebhookClient(id, token);
    }
  }

  build(success = false, product, price, store, profile, size, image) {
    if (this.hook) {
      const embed = new RichEmbed()
        .setTitle(success ? 'Successful checkout!' : 'Payment failed!')
        .setColor(success ? 4631988 : 15679838)
        .setTimestamp(new Date())
        .setFooter(
          'Nebula Orion © 2019',
          'https://pbs.twimg.com/profile_images/1133844004141961216/rZL94TBk_400x400.png',
        );

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

      if (profile) {
        embed.addField('Billing Profile', `${profile}`, true);
      }

      embed.addField('Size', size, true);

      return { embed, client: this.hook };
    }
    return null;
  }
}
