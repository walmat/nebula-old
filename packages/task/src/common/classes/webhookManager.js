import Discord from './discord';
import Slack from './slack';
import { Task } from '../constants';

const { HookTypes } = Task;

export default class WebhookManager {
  static sanitize(embed = {}) {
    const newEmbed = embed;
    delete newEmbed.profile;
    delete newEmbed.order;
    delete newEmbed.checkoutUrl;
    return newEmbed;
  }

  constructor(logger) {
    this._logger = logger;
    this._webhooks = new Map();
    this._queue = [];

    const url =
      process.env.NEBULA_ENV === 'development'
        ? process.env.NEBULA_ENV_WEBHOOK_DEV_URL
        : process.env.NEBULA_ENV_WEBHOOK_URL;

    this._webhooks.set(process.env.NEBULA_ENV_WEBHOOK_ID, new Discord(url));
  }

  registerAll(webhooks) {
    webhooks.forEach(w => this.register(w));
  }

  deregisterAll(webhooks) {
    webhooks.forEach(w => this.deregister(w));
  }

  register({ id, url, type }) {
    this._logger.debug('Registering %s webhook...', type);

    let exists = this._webhooks.get(id);
    if (exists) {
      if (type === HookTypes.discord) {
        exists = new Discord(url);
      } else if (type === HookTypes.slack) {
        exists = new Slack(url);
      }
      return this._webhooks.set(id, exists);
    }

    this._logger.debug('New Webhook Detected! Adding now');

    let client;
    if (type === HookTypes.discord) {
      client = new Discord(url);
    } else if (type === HookTypes.slack) {
      client = new Slack(url);
    }

    this._logger.debug('Webhook added with id %s', id);
    return this._webhooks.set(id, client);
  }

  deregister({ id }) {
    this._logger.debug('Deregistering %s webhook...', id);
    return this._webhooks.delete(id);
  }

  // send hooks here..
  notify(embed) {
    const interval = setInterval(async () => {
      try {
        // eslint-disable-next-line no-restricted-syntax
        for (const [id, client] of this._webhooks.entries()) {
          let sanitized = embed;
          if (id === process.env.NEBULA_ENV_WEBHOOK_ID) {
            sanitized = WebhookManager.sanitize(embed);
          }
          // eslint-disable-next-line no-await-in-loop
          const toSend = await client.build(sanitized);
          // eslint-disable-next-line no-await-in-loop
          await client.send(toSend);
        }
        clearInterval(interval);
      } catch (e) {
        this._logger.error('Error sending webhook! %j', e);
        this.notify(embed);
      }
    }, 2500);
  }

  insert(datum) {
    if (datum) {
      this._queue.push(datum);
    }
  }

  async send() {
    this._logger.debug('Queue length: %j', this._queue.length);
    if (this._queue.length) {
      return this.notify(this._queue.pop());
    }
    return null;
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

    let embed;
    if (type === HookTypes.discord) {
      embed = new Discord(hook).build(...payload);
    } else if (type === HookTypes.slack) {
      embed = new Slack(hook).build(...payload);
    }

    if (embed) {
      embed.send();
    }
  }
}
