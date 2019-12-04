import { Discord, Slack } from '../../shopify/hooks';
import { Task } from '../constants';

const { HookTypes } = Task;

export default class WebhookManager {
  constructor(logger) {
    this._logger = logger;
    this._queue = [];
  }

  // send hooks here..
  notify({ embed, client }) {
    const interval = setInterval(async () => {
      try {
        await client.send(embed);
        clearInterval(interval);
      } catch (e) {
        this._logger.error('Error sending webhook! %j', e);
        // fail silently...
        this.notify({ embed, client });
      }
    }, 2500);
  }

  insert(datum) {
    if (datum) {
      this._queue.push(datum);
    }
  }

  async send() {
    if (this._queue.length) {
      await this.notify(this._queue.pop());
    }
  }

  async test(hook, type) {
    this._logger.silly('Testing %s with url: %s', type, hook);
    const payload = [
      true,
      'SAFE',
      null,
      { name: 'Yeezy Boost 350 v2 – Static', url: 'https://example.com' },
      '$220.00',
      { name: 'Test Site', url: 'https://example.com' },
      { number: '#123123', url: 'https://example.com' },
      'Test Profile',
      'Random',
      'https://stockx-360.imgix.net/Adidas-Yeezy-Boost-350-V2-Static-Reflective/Images/Adidas-Yeezy-Boost-350-V2-Static-Reflective/Lv2/img01.jpg',
    ];

    let webhook;
    if (type === HookTypes.discord) {
      webhook = new Discord(hook).build(...payload);
    } else if (type === HookTypes.slack) {
      webhook = new Slack(hook).build(...payload);
    }

    if (webhook) {
      this.insert(webhook);
      await this.send();
    }
  }
}
