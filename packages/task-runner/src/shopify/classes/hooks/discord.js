const Webhook = require('discord-webhooks');
const { colors } = require('./index');

class Discord {
  constructor(test = false, hook) {
    this.test = test;
    this.hook = hook;
  }

  send(success = false, product, size, store, time, image) {
    if (this.hook) {
      const hook = new Webhook(this.hook);
      hook.on('ready', () => {
        const exec = {
          embeds: [
            {
              title: success ? 'Successful checkout' : 'Payment failed',
              color: success ? colors.SUCCESS : colors.ERROR,
              timestamp: new Date().toISOString(),
              footer: {
                icon_url: '',
                text: 'Nebula Orion',
              },
              thumbnail: {
                url: image,
              },
              author: {
                name: 'Nebua Orion',
                url: 'https://nebulabots.com',
                icon_url: '',
              },
              fields: [
                {
                  name: 'Store',
                  value: store,
                },
                {
                  name: 'Product',
                  value: product,
                },
                {
                  name: 'Size(s)',
                  value: size,
                },
                {
                  name: 'Checkout Time (ms)',
                  value: time,
                },
              ],
            },
          ],
        };

        hook.execute(exec);
      });
    }
  }
}
module.exports = Discord;
