import SlackWebhook from 'slack-webhook';

class Slack {
  constructor(hook) {
    if (hook) {
      this.hook = new SlackWebhook(hook);
    }
  }

  build(success = false, product, price, site, profile, size, image) {
    if (this.hook) {
      let fallback;

      const embed = {
        attachments: [
          {
            fallback,
            title: success ? 'Successful checkout!' : 'Payment failed!',
            color: success ? '#46ADB4' : '#EF415E',
            fields: [
              {
                title: 'Product',
                value: product,
                short: true,
              },
              {
                title: 'Price',
                value: price,
                short: true,
              },
              {
                title: 'Store',
                value: `<${site.url}|${site.name}>`,
                short: true,
              },
            ],
            thumb_url: image,
            footer: 'Nebula Orion @ 2019',
            footer_icon:
              'https://pbs.twimg.com/profile_images/1133844004141961216/rZL94TBk_400x400.png',
            ts: Math.floor(new Date().getTime() / 1000),
          },
        ],
      };

      if (profile) {
        embed.attachments.push({
          title: 'Billing Profile',
          value: profile,
          short: true,
        });
      }

      embed.attachments.push({
        title: 'Size',
        value: size,
        short: true,
      });

      return { embed, client: this.hook };
    }
    return null;
  }
}
module.exports = Slack;
