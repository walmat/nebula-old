const webhook = require('webhook-discord');
const Notification = require('../notification');

class Discord extends Notification {
  constructor(hook) {
    super({ discord: hook });
    this.hook = new webhook.Webhook(hook || null);

    // object initially is a test object
    super.embed = new webhook.MessageBuilder()
      .setName('Nebula Orion')
      .setColor('#46ADB4')
      .setThumbnail(
        'https://stockx-360.imgix.net/Adidas-Yeezy-Boost-350-V2-Static/Images/Adidas-Yeezy-Boost-350-V2-Static/Lv2/img01.jpg?auto=format,compress&w=1117&q=90',
      )
      .addField('Product', 'Yeezy Boost 350 Static', true)
      .addField('Size(s)', '8.5', true)
      .addField('Profile', 'Test VISA', true)
      .addField('Checkout (ms)', '1500', true)
      .addField('Order Details', '#123123', true)
      .setTime();
  }

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
    super.embed = new webhook.MessageBuilder()
      .setName('Nebula Orion')
      .setColor(color)
      .setThumbnail(thumbnailUrl)
      .addField('Product', product.title, true)
      .addField('Size(s)', sizes, true)
      .addField('Profile', profile, true)
      .addField('Checkout (ms)', checkoutTime, true)
      .addField('Order Details', orderLink, true)
      .setTime(timestamp);
  }

  /**
   * Calls `Notification` send method
   */
  send() {
    return super.send(this.hook);
  }
}
module.exports = Discord;
