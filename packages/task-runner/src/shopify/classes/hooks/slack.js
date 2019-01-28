const Webhook = require('slack-webhook');
const { colors } = require('./index');

class Slack {
  constructor(test = false, hook) {
    this.test = test;
    this.hook = hook;
  }

  send(success = false, product, size, store, time, image) {
    if (this.hook) {
      const hook = new Webhook(this.hook);
      hook.send({
        attachments: [
          {
            fallback: success ? 'Successful checkout' : 'Payment failed',
            title: success ? 'Successful checkout' : 'Payment failed',
            color: success ? colors.SUCCESS : colors.ERROR,
            fields: [
              {
                title: 'Store',
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
            thumb_url: image,
            footer: 'Nebula Orion',
          },
        ],
      });
    }
  }
}
module.exports = Slack;
