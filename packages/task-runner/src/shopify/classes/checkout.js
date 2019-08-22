/* eslint-disable class-methods-use-this */
import HttpsProxyAgent from 'https-proxy-agent';
import { isEmpty } from 'lodash';
import { URL } from 'url';

const cheerio = require('cheerio');
const { notification } = require('./hooks');
const { getHeaders, stateForError, userAgent, currencyWithSymbol } = require('./utils');
const { buildPaymentForm } = require('./utils/forms');
const { States, Events, Types, Modes } = require('./utils/constants').TaskRunner;

class Checkout {
  get context() {
    return this._context;
  }

  get checkoutType() {
    return this._checkoutType;
  }

  constructor(context) {
    this._context = context;
    this._logger = this._context.logger;
    this._request = this._context.request;
    this._jar = this._context.jar;
    this._events = this._context.events;
    this._delayer = this._context.delayer;
    this._signal = this._context.signal;
    this._checkoutType = this._context.checkoutType;

    this.shippingMethods = [];
    const preFetchedShippingRates = this._context.task.profile.rates.find(
      r => r.site.url === this._context.task.site.url,
    );

    if (
      this._context.type === Types.Normal &&
      preFetchedShippingRates &&
      preFetchedShippingRates.selectedRate
    ) {
      const { name, price, rate } = preFetchedShippingRates.selectedRate;
      this.chosenShippingMethod = {
        name,
        price,
        id: rate,
      };
    } else {
      this.chosenShippingMethod = {
        name: null,
        id: null,
      };
    }

    this.paymentToken = null;
    this.paymentGateway = '';
    this.checkoutToken = null;
    this.checkoutKey = null;
    this.storeId = null;
    this.protection = [];
    this.needsCaptcha = false;
    this.shouldContinue = false;

    if (this._context.task.checkoutUrl) {
      const [checkoutUrl, key] = this._context.task.checkoutUrl.split('?');
      this.paymentToken = this._context.task.paymentToken;
      this.needsCaptcha = this._context.task.needsCaptcha;
      [, , , this.storeId, , this.checkoutToken] = checkoutUrl.split('/');
      [, this.checkoutKey] = key.split('=');
      this.shouldContinue = true;
    }

    this.prices = {
      item: 0,
      shipping: 0,
      total: 0,
    };

    this.selectedShippingRate = null;
    this.captchaToken = '';
    this.needsLogin = (this._context.task.username && this._context.task.password) || false;
    this.needsPatched = true;
    this.captchaTokenRequest = null;
  }

  _emitEvent(event, payload) {
    switch (event) {
      // Emit supported events on their specific channel
      case Events.TaskStatus: {
        this._events.emit(event, this._context.id, payload, event);
        break;
      }
      default: {
        break;
      }
    }
    this._logger.silly('Event %s emitted: %j', event, payload);
  }

  _emitTaskEvent(payload = {}) {
    if (payload.message && payload.message !== this._context.status) {
      this._context.status = payload.message;
      this._emitEvent(Events.TaskStatus, { ...payload, type: this._type });
    }
  }

  async parseBotProtection($) {
    const elements = $('input#field_start').nextUntil('input#field_end', 'textarea');

    if (!elements || !elements.length) {
      return [];
    }

    const hashes = [];
    elements.each((_, textarea) => {
      const hash = $(textarea).attr('id');

      this._logger.debug('BOT PROTECTION HASH: ', hash);
      if (!hash) {
        return;
      }
      hashes.push(hash);
    });

    return hashes;
  }

  async addToCart() {
    throw new Error('Should be defined in subclasses');
  }

  async shippingRates() {
    throw new Error('Should be defined in subclasses');
  }

  async getPaymentToken() {
    const {
      task: {
        site: { apiKey, url },
        profile: { payment, billing },
        type,
      },
      proxy,
    } = this._context;

    try {
      const res = await this._request('https://elb.deposit.shopifycs.com/sessions', {
        method: 'POST',
        agent: proxy ? new HttpsProxyAgent(proxy) : null,
        headers: {
          'User-Agent': userAgent,
          'Content-Type': 'application/json',
          Connection: 'Keep-Alive',
        },
        body: JSON.stringify(buildPaymentForm(payment, billing)),
      });

      const { status } = res;

      const checkStatus = stateForError(
        { status },
        {
          message: 'Creating payment session',
          nextState: States.PAYMENT_TOKEN,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      const { id } = await res.json();

      if (id) {
        this._logger.silly('Payment token: %s', id);
        this.paymentToken = id;
        if (!apiKey) {
          return { message: 'Getting site data', nextState: States.GET_SITE_DATA };
        }

        if (type === Modes.SAFE || (/eflash/i.test(url) || /palace/i.test(url))) {
          return { message: 'Parsing products', nextState: States.MONITOR };
        }
        return { message: 'Creating checkout', nextState: States.CREATE_CHECKOUT };
      }
      return {
        message: 'Creating payment session',
        nextState: States.PAYMENT_TOKEN,
      };
    } catch (err) {
      this._logger.error(
        'API CHECKOUT: %s Request Error..\n Step: Payment Token.\n\n %j %j',
        err.statusCode,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Creating payment session',
        nextState: States.PAYMENT_TOKEN,
      });

      const message = err.statusCode
        ? `Creating payment session - (${err.statusCode})`
        : 'Creating payment session';

      return nextState || { message, nextState: States.PAYMENT_TOKEN };
    }
  }

  // MARK : Shared super class methods
  async login() {
    const {
      task: {
        site: { url },
        username,
        password,
      },
      proxy,
    } = this._context;

    const form = new URLSearchParams();
    let heads = {
      'User-Agent': userAgent,
    };

    if (this.captchaToken) {
      form.append('utf8', '✓');
      form.append('authenticity_token', '');
      form.append('g-recaptcha-response', this.captchaToken);
      heads = {
        ...heads,
        Referer: `${url}/challenge`,
      };
    } else {
      form.append('form_data', 'customer_login');
      form.append('utf8', '✓');
      form.append('customer[email]', username);
      form.append('customer[password]', password);
      form.append('Referer', `${url}/account/login`);
    }

    try {
      const res = await this._request(`${url}/account/login`, {
        method: 'POST',
        agent: proxy ? new HttpsProxyAgent(proxy) : null,
        redirect: 'manual',
        follow: 0,
        headers: heads,
        body: form,
      });

      const { status, headers } = res;

      const checkStatus = stateForError(
        { status },
        {
          message: 'Logging in',
          nextState: States.LOGIN,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      const redirectUrl = headers.get('location');

      if (/password/i.test(redirectUrl)) {
        return { message: 'Password page', delay: true, nextState: States.LOGIN };
      }

      if (/challenge/i.test(redirectUrl)) {
        return { message: 'Waiting for captcha', nextState: States.CAPTCHA };
      }

      if (/login/i.test(redirectUrl)) {
        return { message: 'Invalid login credentials', nextState: States.ERROR };
      }

      if (/account/i.test(redirectUrl)) {
        this.needsLogin = false; // update global check for login
        return { message: 'Creating checkout', nextState: States.CREATE_CHECKOUT };
      }

      const message = status ? `Logging in - (${status})` : 'Logging in';
      return { message, nextState: States.LOGIN };
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %s Request Error..\n Step: Login.\n\n %j %j',
        err.statusCode,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Logging in',
        nextState: States.LOGIN,
      });

      const message = err.statusCode ? `Logging in - (${err.statusCode})` : 'Logging in';
      return nextState || { message, nextState: States.LOGIN };
    }
  }

  async getSiteData() {
    const {
      task: {
        site: { url },
        type,
      },
      proxy,
    } = this._context;

    try {
      const res = await this._request(url, {
        method: 'GET',
        agent: proxy ? new HttpsProxyAgent(proxy) : null,
        redirect: 'follow',
        headers: {
          'User-Agent': userAgent,
        },
      });

      const { status } = res;

      const checkStatus = stateForError(
        { status },
        {
          message: 'Getting site data',
          nextState: States.GET_SITE_DATA,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      const body = await res.text();
      let match = body.match(/<meta\s*name="shopify-checkout-api-token"\s*content="(.*)">/);

      let accessToken;
      if (match && match.length) {
        [, accessToken] = match;
        this._context.task.site.apiKey = accessToken;
      }

      if (!accessToken) {
        // check the script location as well
        match = body.match(/"accessToken":(.*)","betas"/);

        if (!match || !match.length) {
          return { message: 'Invalid Shopify Site', nextState: States.STOP };
        }
        [, accessToken] = match;
        this._context.task.site.apiKey = accessToken;
      }
      if (type === Modes.SAFE) {
        return { message: 'Parsing products', nextState: States.MONITOR };
      }
      return { message: 'Creating checkout', nextState: States.CREATE_CHECKOUT };
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %d Request Error..\n Step: Parse Access Token.\n\n %j %j',
        err.statusCode,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Getting site data',
        nextState: States.GET_SITE_DATA,
      });

      const message = err.statusCode
        ? `Getting site data - (${err.statusCode})`
        : 'Getting site data';

      return nextState || { message, nextState: States.GET_SITE_DATA };
    }
  }

  async createCheckout() {
    const {
      task: {
        site: { url, apiKey },
        type,
      },
      proxy,
    } = this._context;

    try {
      const res = await this._request(`${url}/checkout`, {
        method: 'POST',
        agent: proxy ? new HttpsProxyAgent(proxy) : null,
        redirect: 'manual',
        follow: 0,
        headers: getHeaders({ url, apiKey }),
        body: JSON.stringify({}),
      });

      const { status, headers } = res;

      const checkStatus = stateForError(
        { status },
        {
          message: 'Creating checkout',
          nextState: States.CREATE_CHECKOUT,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      const redirectUrl = headers.get('location');
      this._logger.silly('Create checkout redirect url: %j', redirectUrl);

      if (redirectUrl) {
        if (/password/i.test(redirectUrl)) {
          return { message: 'Password page', delay: true, nextState: States.CREATE_CHECKOUT };
        }

        if (/throttle/i.test(redirectUrl)) {
          const ctd = this.getCtdCookie(this._jar);

          if (!ctd) {
            return { message: 'Polling queue', nextState: States.QUEUE };
          }

          try {
            await this._request(`https://${url}/throttle/queue?_ctd=${ctd}_ctd_update=`, {
              method: 'GET',
              agent: proxy ? new HttpsProxyAgent(proxy) : null,
              redirect: 'manual',
              follow: 0,
              headers: {
                'Upgrade-Insecure-Requests': 1,
                'User-Agent': userAgent,
                Connection: 'Keep-Alive',
              },
            });
          } catch (error) {
            // fail silently...
          }

          return { message: 'Polling queue', nextState: States.QUEUE };
        }

        if (/checkouts/i.test(redirectUrl)) {
          [, , , this.storeId, , this.checkoutToken] = redirectUrl.split('/');
          if (type === Modes.SAFE || (/eflash/i.test(url) || /palace/i.test(url))) {
            return { message: 'Going to checkout', nextState: States.GO_TO_CHECKOUT };
          }
          return { message: 'Parsing products', nextState: States.MONITOR };
        }
      }

      const message = status ? `Creating checkout - (${status})` : 'Creating checkout';
      return { message, nextState: States.CREATE_CHECKOUT };
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %d Request Error..\n Step: Create Checkout.\n\n %j %j',
        err.statusCode,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Creating checkout',
        nextState: States.CREATE_CHECKOUT,
      });

      const message = err.statusCode
        ? `Creating checkout - (${err.statusCode})`
        : 'Creating checkout';

      return nextState || { message, nextState: States.CREATE_CHECKOUT };
    }
  }

  async getCtdCookie(jar) {
    const store = jar.Store || jar.store;

    if (!store) {
      return null;
    }

    let found = null;
    store.getAllCookies((_, cookies) => {
      for (let i = 0; i < cookies.length; i += 1) {
        const cookie = cookies[i];
        if (cookie.key.indexOf('_ctd') > -1) {
          this._logger.debug('Found existing ctd cookie %j', cookie);
          found = cookie.value;
          break;
        }
      }
    });
    return found;
  }

  /**
   * Handles polling a checkout queue for Shopify
   *
   * Can happen after:
   * 1. Creating checkout -> proceed to patching checkout
   * 2. Patching checkout -> [api] proceed to monitor / [fe] proceed to shipping rates
   * 3. Add to cart -> [api] proceed to shipping rates / [fe] (?) proceed to create checkout
   * @returns {} || `CheckoutObject`
   */
  async pollQueue() {
    const {
      task: {
        site: { url },
        type,
      },
      proxy,
      timers: { monitor },
    } = this._context;

    try {
      const res = await this._request('/checkout/poll?js_poll=1', {
        method: 'GET',
        agent: proxy ? new HttpsProxyAgent(proxy) : null,
        redirect: 'manual',
        follow: 0,
        headers: {
          'User-Agent': userAgent,
          Connection: 'Keep-Alive',
        },
      });

      const { status, headers } = res;

      this._logger.silly('Checkout: poll response %d', status);
      const checkStatus = stateForError(
        { status },
        {
          message: 'Polling queue',
          nextState: States.QUEUE,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      // check server error
      if (status === 400) {
        return { message: `Invalid checkout!`, nextState: States.CREATE_CHECKOUT };
      }

      // const ctd = await this.getCtdCookie(this._jar);
      const body = await res.text();

      this._logger.silly('CHECKOUT: Queue response: %j \nBody: %j', status, body);

      let redirectUrl = null;
      if (status === 302) {
        redirectUrl = headers.get('location');

        if (!redirectUrl || /throttle/i.test(redirectUrl)) {
          return { message: `Polling queue - (${status})`, nextState: States.QUEUE };
        }

        if (/_ctd/i.test(redirectUrl)) {
          try {
            const response = await this._request(redirectUrl, {
              method: 'GET',
              agent: proxy ? new HttpsProxyAgent(proxy) : null,
              redirect: 'manual',
              headers: {
                'Upgrade-Insecure-Requests': 1,
                'User-Agent': userAgent,
                Connection: 'Keep-Alive',
              },
            });

            const respBody = await response.text();

            this._logger.silly('NEW QUEUE BODY: %j', respBody);

            const [, checkoutUrl] = respBody.match(/href="(.*)"/);

            if (checkoutUrl && /checkouts/i.test(checkoutUrl)) {
              const [checkoutNoQs] = checkoutUrl.split('?');
              [, , , this.storeId, , this.checkoutToken] = checkoutNoQs.split('/');
              if (type === Modes.FAST) {
                monitor.start();
              }
              return { queue: 'done' };
            }
          } catch (e) {
            this._logger.error('Error with getting cookied checkout: %j', e);
          }
        }
        this._logger.silly('CHECKOUT: Polling queue redirect url %s...', redirectUrl);
      } else if (status === 200) {
        if (isEmpty(body) || (!isEmpty(body) && body.length < 2)) {
          const ctd = this.getCtdCookie(this._jar);

          try {
            const response = await this._request(
              `https://${url}/throttle/queue?_ctd=${ctd}_ctd_update=`,
              {
                method: 'GET',
                agent: proxy ? new HttpsProxyAgent(proxy) : null,
                redirect: 'manual',
                follow: 0,
                headers: {
                  'Upgrade-Insecure-Requests': 1,
                  'User-Agent': userAgent,
                  Connection: 'Keep-Alive',
                },
              },
            );

            const respBody = await response.text();

            const [, checkoutUrl] = respBody.match(/href="(.*)"/);

            if (checkoutUrl && /checkouts/i.test(checkoutUrl)) {
              const [checkoutNoQs] = checkoutUrl.split('?');
              [, , , this.storeId, , this.checkoutToken] = checkoutNoQs.split('/');
              if (type === Modes.FAST) {
                monitor.start();
              }
              return { queue: 'done' };
            }
          } catch (error) {
            // fail silently...
          }
        }
        const $ = cheerio.load(body, { xmlMode: true, normalizeWhitespace: true });
        [redirectUrl] = $('input[name="checkout_url"]')
          .val()
          .split('?');
      }
      if (redirectUrl) {
        const [redirectNoQs] = redirectUrl.split('?');
        [, , , this.storeId, , this.checkoutToken] = redirectNoQs.split('/');

        if (type === Modes.FAST) {
          monitor.start();
        }
        return { queue: 'done' };
      }
      this._logger.silly('CHECKOUT: Not passed queue, delaying 2000 ms');
      const message = status ? `Polling queue - (${status})` : 'Polling queue';
      return { message, delay: true, nextState: States.QUEUE };
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %s Request Error..\n Step: Poll Queue.\n\n %j %j',
        err.statusCode,
        err.message,
        err.stack,
      );
      const nextState = stateForError(err, {
        message: 'Polling queue',
        nextState: States.QUEUE,
      });

      const message = err.statusCode ? `Polling queue - (${err.statusCode})` : 'Polling queue';

      return nextState || { message, nextState: States.QUEUE };
    }
  }

  async paymentProcessing() {
    const {
      task: {
        site: { url, apiKey, name },
        product: { chosenSizes, name: productName, url: productUrl },
        profile: { profileName },
        checkoutSpeed,
        type,
      },
      proxy,
      slack,
      discord,
    } = this._context;

    try {
      const res = await this._request(`${url}/api/checkouts/${this.checkoutToken}/payments`, {
        method: 'GET',
        agent: proxy ? new HttpsProxyAgent(proxy) : null,
        redirect: 'manual',
        headers: {
          ...getHeaders({ url, apiKey }),
          'Content-Type': 'application/json',
          'Upgrade-Insecure-Requests': '1',
          'X-Shopify-Storefront-Access-Token': `${apiKey}`,
        },
      });

      const body = await res.json();

      const { status } = res;

      const checkStatus = stateForError(
        { status },
        {
          message: 'Processing payment',
          nextState: States.PROCESS_PAYMENT,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      const { payments } = body;

      if (payments && payments.length) {
        const bodyString = JSON.stringify(payments[0]);
        const [payment] = payments;

        const {
          currency,
          payment_due: paymentDue,
          line_items: lineItems,
          web_url: webUrl,
        } = payment.checkout;

        const imageUrl = lineItems[0].image_url.startsWith('http')
          ? lineItems[0].image_url
          : `https:${lineItems[0].image_url}`;

        this._logger.silly('CHECKOUT: Payment object: %j', payment);
        if (/thank_you/i.test(bodyString)) {
          const {
            order: { name: orderName, status_url: statusUrl },
          } = payment.checkout;

          try {
            await notification(slack, discord, {
              success: true,
              type,
              checkoutUrl: webUrl,
              product: {
                name: productName,
                url: productUrl,
              },
              price: currencyWithSymbol(paymentDue, currency),
              site: { name, url },
              order: {
                number: orderName || 'None',
                url: statusUrl,
              },
              profile: profileName,
              sizes: chosenSizes,
              checkoutSpeed,
              shippingMethod: this.chosenShippingMethod.id,
              image: imageUrl,
            });
          } catch (err) {
            // fail silently...
          }

          return {
            message: `Payment successful! Order ${orderName}`,
            order: { number: orderName, url: statusUrl },
            nextState: States.DONE,
          };
        }

        if (/your card was declined/i.test(bodyString)) {
          try {
            await notification(slack, discord, {
              success: false,
              type,
              checkoutUrl: webUrl,
              product: {
                name: productName,
                url: productUrl,
              },
              price: currencyWithSymbol(paymentDue, currency),
              site: { name, url },
              order: null,
              profile: profileName,
              sizes: chosenSizes,
              checkoutSpeed,
              shippingMethod: this.chosenShippingMethod.id,
              image: imageUrl,
            });
          } catch (err) {
            // fail silently...
          }
          return { message: 'Card declined', nextState: States.STOP };
        }

        const { payment_processing_error_message: paymentProcessingErrorMessage } = payments[0];

        if (paymentProcessingErrorMessage !== null) {
          if (/no longer available/i.test(paymentProcessingErrorMessage)) {
            try {
              await notification(slack, discord, {
                success: false,
                type,
                checkoutUrl: webUrl,
                product: {
                  name: productName,
                  url: productUrl,
                },
                price: currencyWithSymbol(paymentDue, currency),
                site: { name, url },
                order: null,
                profile: profileName,
                sizes: chosenSizes,
                checkoutSpeed,
                shippingMethod: this.chosenShippingMethod.id,
                image: imageUrl,
              });
            } catch (err) {
              // fail silently...
            }
            return { message: 'Payment failed (OOS)', nextState: States.STOP };
          }

          try {
            await notification(slack, discord, {
              success: false,
              type,
              checkoutUrl: webUrl,
              product: {
                name: productName,
                url: productUrl,
              },
              price: currencyWithSymbol(paymentDue, currency),
              site: { name, url },
              order: null,
              profile: profileName,
              sizes: chosenSizes,
              checkoutSpeed,
              shippingMethod: this.chosenShippingMethod.id,
              image: imageUrl,
            });
          } catch (err) {
            // fail silently...
          }
          return { message: 'Payment failed', nextState: States.STOP };
        }
      }
      this._logger.silly('CHECKOUT: Processing payment');
      return { message: 'Processing payment', delay: true, nextState: States.PROCESS_PAYMENT };
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %s Request Error..\n Step: Process Payment.\n\n %j %j',
        err.statusCode,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Processing payment',
        nextState: States.PROCESS_PAYMENT,
      });

      const message = err.statusCode
        ? `Processing payment - (${err.statusCode})`
        : 'Processing payment';

      return nextState || { message, nextState: States.PROCESS_PAYMENT };
    }
  }
}

module.exports = Checkout;
