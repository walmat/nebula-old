import SlackWebhook from 'slack-webhook';

export default class Slack {
  constructor(hook) {
    if (hook) {
      this.hook = new SlackWebhook(hook);
    }
  }

  build(success = false, product, price, store, profile, size, image) {
    if (this.hook) {
      let fallback;

      const embed = {
        attachments: [
          {
            fallback,
            title: success ? 'Successful checkout!' : 'Payment failed!',
            color: success ? '#46ADB4' : '#EF415E',
            fields: [],
            footer: 'Nebula Orion @ 2019',
            footer_icon:
              'https://pbs.twimg.com/profile_images/1133844004141961216/rZL94TBk_400x400.png',
            ts: Math.floor(new Date().getTime() / 1000),
          },
        ],
      };

      if (image) {
        embed.attachments[0].thumb_url = image;
      }

      if (product) {
        embed.attachments[0].fields.push({
          title: 'Product',
          value: product,
          short: true,
        });
      }

      if (price) {
        embed.attachments[0].fields.push({
          title: 'Price',
          value: price,
          short: true,
        });
      }

      if (store) {
        if (store.url) {
          embed.attachments[0].fields.push({
            title: 'Store',
            value: `<${store.url}|${store.name}>`,
            short: true,
          });
        } else if (store.name) {
          embed.attachments[0].fields.push({
            title: 'Store',
            value: store.name,
            short: true,
          });
        }
      }

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
