const SlackWebhook = require('slack-webhook');
const Notification = require('../notification');

class Slack extends Notification {
  constructor(hook) {
    super({ slack: hook });
    this.hook = new SlackWebhook(hook || null);

    super.embed = {
      attachments: [
        {
          fallback: 'Nebula Orion: Successful checkout',
          color: '#46ADB4',
          fields: [
            {
              title: 'Product',
              value: 'Yeezy Boost 350 Static',
              short: true,
            },
            {
              title: 'Size(s)',
              value: '8.5',
              short: true,
            },
            {
              title: 'Profile',
              value: 'Simple VISA',
              short: true,
            },
            {
              title: 'Checkout (ms)',
              value: '1500',
              short: true,
            },
            {
              title: 'Order Details',
              value: '#123123',
              short: true,
            },
          ],
          thumb_url:
            'http://example.com/path/to/thumb.pnghttps://stockx-360.imgix.net/Adidas-Yeezy-Boost-350-V2-Static/Images/Adidas-Yeezy-Boost-350-V2-Static/Lv2/img01.jpg?auto=format,compress&w=1117&q=90',
          footer: 'Nebula Orion',
          ts: 123456789,
        },
      ],
    };
  }

  /**
   * Builds a rich embed for Slack webhooks
   * @param {Object} opts The values passed into build a rich embed
   */
  build(opts) {
    // deconstruct options passed in
    const {
      color,
      timestamp,
      thumbnailUrl,
      product,
      sizes,
      profile,
      checkoutTime,
      orderLink,
    } = opts;

    // update the super classes' embed object
    super.embed = {
      attachments: [
        {
          fallback: 'Nebula Orion: Successful checkout',
          color,
          fields: [
            {
              title: 'Product',
              value: product,
              short: true,
            },
            {
              title: 'Size(s)',
              value: sizes,
              short: true,
            },
            {
              title: 'Profile',
              value: profile,
              short: true,
            },
            {
              title: 'Checkout (ms)',
              value: checkoutTime,
              short: true,
            },
            {
              title: 'Order Details',
              value: orderLink,
              short: true,
            },
          ],
          thumb_url: thumbnailUrl,
          footer: 'Nebula Orion',
          ts: timestamp,
        },
      ],
    };
  }

  /**
   * Calls `Notification` send method
   */
  send() {
    super.send(this.hook);
  }
}
module.exports = Slack;
