const { RichEmbed, WebhookClient } = require('discord.js');

class Discord {
  constructor(hook) {
    if (hook) {
      const [, , , , , id, token] = hook.split('/');
      this.hook = new WebhookClient(id, token);
    }
  }

  build(
    success = false,
    product,
    price,
    site,
    order,
    profile,
    sizes,
    checkoutSpeed,
    shippingMethod,
    logger,
    image,
  ) {
    if (this.hook) {
      const embed = new RichEmbed()
        .setTitle(success ? 'Successful checkout!' : 'Payment failed!')
        .setColor(success ? 4631988 : 15679838)
        .setThumbnail(image)
        .setTimestamp(new Date())
        .addField('Product', `[${product.name}](${product.url})`, true)
        .addField('Price', `${price}`, true)
        .addField('Store', `[${site.name}](${site.url})`, true)
        .addField('Order #', order ? `[${order.number}](${order.url})` : 'None', true)
        .addField('Billing Profile', profile ? `${profile}` : 'None', true)
        .addField('Size(s)', `${sizes[0]}`, true)
        .addField('Checkout Speed (ms)', `${checkoutSpeed}`, true)
        .addField('Shipping Method', shippingMethod ? `${shippingMethod}` : 'None', true)
        .addField('Logger File', logger ? `${logger}` : 'None', true)
        .setFooter(
          'Nebula Orion © 2019',
          'https://pbs.twimg.com/profile_images/997256678650212353/yobeESVF.jpg',
        );
      return this.hook.send(embed);
    }
    return null;
  }
}
module.exports = Discord;
