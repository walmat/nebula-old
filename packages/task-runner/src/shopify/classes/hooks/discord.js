const webhook = require('hookcord');
const { colors } = require('./index');

class Discord {
  constructor(hook) {
    this.hook = new webhook.Hook().setLink(hook);
  }

  send(success = false, site, product, sizes, checkoutSpeed, image) {
    if (this.hook) {
      const embed = {
        embeds: [
          {
            title: success ? 'Successfully checked out!' : 'Payment failed',
            color: success ? colors.SUCCESS : colors.ERROR,
            thumbnail: {
              url: 'https://cdn.discordapp.com/embed/avatars/0.png',
            },
            fields: [
              {
                name: 'Store',
                value: `[${site.name}](${site.url})`,
                inline: true,
              },
              {
                name: 'Product',
                value: `[${product.name}](${product.url})`,
                inline: true,
              },
              {
                name: 'Size(s)',
                value: sizes,
                inline: true,
              },
              {
                name: 'Checkout Speed (ms)',
                value: checkoutSpeed,
                inline: true,
              },
            ],
            timestamp: new Date(),
          },
        ],
      };
      return this.hook.setPayload(embed).fire();
    }
    return null;
  }
}
module.exports = Discord;
