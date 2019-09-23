/* eslint-disable class-methods-use-this */
import HttpsProxyAgent from 'https-proxy-agent';
import { isEmpty } from 'lodash';
import { parse } from 'query-string';

const cheerio = require('cheerio');
const { Events } = require('../../constants').Runner;
const { userAgent, currencyWithSymbol } = require('../../common');
const { notification } = require('./hooks');
const { getHeaders, stateForError } = require('./utils');
const { buildPaymentForm } = require('./utils/forms');
const { States, Modes, Types } = require('./utils/constants').TaskRunner;

class Checkout {
  get context() {
    return this._context;
  }

  get checkoutType() {
    return this._checkoutType;
  }

  constructor(context, type = Modes.UNKNOWN) {
    this._context = context;
    this._logger = this._context.logger;
    this._request = this._context.request;
    this._jar = this._context.jar;
    this._events = this._context.events;
    this._delayer = this._context.delayer;
    this._signal = this._context.signal;
    this._checkoutType = type;

    this.shippingMethods = [];
    const preFetchedShippingRates = this._context.task.profile.rates.find(
      r => r.site.url === this._context.task.site.url,
    );

    if (this._context.type && preFetchedShippingRates && preFetchedShippingRates.selectedRate) {
      if (
        type === Modes.FAST ||
        (type === Modes.SAFE && /dsm sg|dsm jp|dsm uk/i.test(this._context.task.site.name))
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
    } else {
      this.chosenShippingMethod = {
        name: null,
        id: null,
      };
    }

    this.cartForm = '';
    this.paymentToken = null;
    this.checkoutToken = null;
    this.checkoutKey = null;
    this.storeId = null;
    this.needsCaptcha = false;

    this.prices = {
      item: 0,
      shipping: 0,
      total: 0,
    };

    this.selectedShippingRate = null;
    this.captchaToken = '';
    this.needsLogin = this._context.task.account || false;
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
    this._context.status = payload.message;
    this._emitEvent(Events.TaskStatus, { ...payload, type: Types.Normal });
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
        profile: { payment, billing },
        site: { url },
      },
      proxy,
    } = this._context;

    let location = `${url}/${this.storeId}/checkouts/${this.checkoutToken}?previous_step=shipping_method&step=payment_method`;
    location = encodeURIComponent(location);
    location += `&dir=ltr&fonts[]=Roboto`;

    try {
      let res = await this._request('https://elb.deposit.shopifycs.com/sessions', {
        method: 'OPTIONS',
        agent: proxy ? new HttpsProxyAgent(proxy) : null,
        headers: {
          'User-Agent': userAgent,
          'Content-Type': 'application/json',
          'Access-Control-Request-Headers': 'content-type',
          'Access-Control-Request-Method': 'POST',
          DNT: 1,
          Connection: 'Keep-Alive',
          Origin: 'https://checkout.shopifycs.com',
          'Sec-Fetch-Mode': 'no-cors',
          Referer: `https://checkout.shopifycs.com/number?identifier=${this.checkoutToken}&location=${location}`,
        },
      });

      if (!res.ok) {
        return { nextState: States.PAYMENT_TOKEN };
      }

      res = await this._request('https://elb.deposit.shopifycs.com/sessions', {
        method: 'POST',
        agent: proxy ? new HttpsProxyAgent(proxy) : null,
        headers: {
          'User-Agent': userAgent,
          'Content-Type': 'application/json',
          'Access-Control-Request-Headers': 'content-type',
          'Access-Control-Request-Method': 'POST',
          DNT: 1,
          Connection: 'Keep-Alive',
          Origin: 'https://checkout.shopifycs.com',
          'Sec-Fetch-Mode': 'no-cors',
          Referer: `https://checkout.shopifycs.com/number?identifier=${this.checkoutToken}&location=${location}`,
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
        return { done: true };
      }
      return {
        message: 'Creating payment session',
        nextState: States.PAYMENT_TOKEN,
      };
    } catch (err) {
      this._logger.error(
        'API CHECKOUT: %s Request Error..\n Step: Payment Token.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Creating payment session',
        nextState: States.PAYMENT_TOKEN,
      });

      const message =
        err.status || err.errno
          ? `Creating payment session - (${err.status || err.errno})`
          : 'Creating payment session';

      return nextState || { message, nextState: States.PAYMENT_TOKEN };
    }
  }

  // MARK : Shared super class methods
  async login() {
    const {
      task: {
        site: { url },
        account: { username, password },
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

        // reset captcha token
        if (this.captchaToken) {
          this.captchaToken = '';
        }
        return { message: 'Creating checkout', nextState: States.CREATE_CHECKOUT };
      }

      const message = status ? `Logging in - (${status})` : 'Logging in';
      return { message, nextState: States.LOGIN };
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %s Request Error..\n Step: Login.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Logging in',
        nextState: States.LOGIN,
      });

      const message =
        err.status || err.errno ? `Logging in - (${err.status || err.errno})` : 'Logging in';

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
        if (!this.needsLogin) {
          return { message: 'Waiting for product', nextState: States.WAIT_FOR_PRODUCT };
        }
        return { message: 'Logging in', nextState: States.LOGIN };
      }
      if (!this.needsLogin) {
        return { message: 'Creating checkout', nextState: States.CREATE_CHECKOUT };
      }
      return { message: 'Logging in', nextState: States.LOGIN };
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %d Request Error..\n Step: Parse Access Token.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Getting site data',
        nextState: States.GET_SITE_DATA,
      });

      const message =
        err.status || err.errno
          ? `Getting site data - (${err.status || err.errno})`
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
      this._logger.debug('Create checkout redirect url: %j', redirectUrl);
      if (redirectUrl) {
        if (/login/i.test(redirectUrl)) {
          return { message: 'Account needed. Stopping..', nextState: States.STOP };
        }
        if (/password/i.test(redirectUrl)) {
          return { message: 'Password page', delay: true, nextState: States.CREATE_CHECKOUT };
        }

        if (/throttle/i.test(redirectUrl)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this.queueReferer = redirectUrl;
            this._logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._request(redirectUrl, {
              method: 'GET',
              agent: proxy ? new HttpsProxyAgent(proxy) : null,
              redirect: 'manual',
              follow: 0,
              headers: {
                'Upgrade-Insecure-Requests': 1,
                'User-Agent': userAgent,
                connection: 'close',
                referer: url,
                accept:
                  'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
                'accept-encoding': 'gzip, deflate, br',
                'accept-language': 'en-US,en;q=0.9',
                host: `${url.split('/')[2]}`,
              },
            });
          } catch (error) {
            // fail silently...
          }

          return { message: 'Polling queue', nextState: States.QUEUE };
        }

        if (/checkouts/i.test(redirectUrl)) {
          [, , , this.storeId, , this.checkoutToken] = redirectUrl.split('/');

          // should take care of dsm sg/jp/uk
          if (type === Modes.SAFE) {
            return { message: 'Waiting for product', nextState: States.WAIT_FOR_PRODUCT };
          }

          return {
            message: 'Submitting information',
            nextState: States.SUBMIT_CUSTOMER,
          };
        }
      }

      const message = status ? `Creating checkout - (${status})` : 'Creating checkout';
      return { message, nextState: States.CREATE_CHECKOUT };
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %d Request Error..\n Step: Create Checkout.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Creating checkout',
        nextState: States.CREATE_CHECKOUT,
      });

      const message =
        err.status || err.errno
          ? `Creating checkout - (${err.status || err.errno})`
          : 'Creating checkout';

      return nextState || { message, nextState: States.CREATE_CHECKOUT };
    }
  }

  async getCookie(jar, name) {
    const store = jar.Store || jar.store;

    if (!store) {
      return null;
    }

    let found = null;
    store.getAllCookies((_, cookies) => {
      for (let i = 0; i < cookies.length; i += 1) {
        const cookie = cookies[i];
        this._logger.info(`Cookie key/value: %j/%j`, cookie.key, cookie.value);
        if (cookie.key.indexOf(name) > -1) {
          this._logger.debug('Found existing ctd cookie %j', cookie.value);
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
      const res = await this._request(`${url}/checkout/poll?js_poll=1`, {
        method: 'GET',
        agent: proxy ? new HttpsProxyAgent(proxy) : null,
        redirect: 'follow',
        follow: 5,
        headers: {
          'User-Agent': userAgent,
          Connection: 'Keep-Alive',
          referer: this.queueReferer,
          connection: 'close',
          accept: '*/*',
          'accept-encoding': 'gzip, deflate, br',
          'accept-language': 'en-US,en;q=0.9',
          host: `${url.split('/')[2]}`,
        },
      });

      const { status } = res;

      this._logger.debug('Checkout: poll response %d', status);
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

      const body = await res.text();

      // check queue error
      if (status === 400) {
        return { message: `Invalid checkout!`, nextState: States.CREATE_CHECKOUT };
      }

      let { url: redirectUrl } = res;

      this._logger.debug('CHECKOUT: Queue response: %j \nBody: %j', status, body);

      if (status === 302) {
        if (!redirectUrl || /throttle/i.test(redirectUrl)) {
          return { message: `Not through queue! (${status})`, nextState: States.QUEUE };
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

            this._logger.debug('NEW QUEUE BODY: %j', respBody);

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
          let ctd;
          if (!this._ctd) {
            ctd = await this.getCookie(this._jar, '_ctd');
          } else {
            ctd = this._ctd;
          }

          try {
            const response = await this._request(`${url}/throttle/queue?_ctd=${ctd}&_ctd_update=`, {
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

            const respBody = await response.text();
            this._logger.debug('QUEUE: 200 RESPONSE BODY: %j', respBody);

            const [, checkoutUrl] = respBody.match(/href="(.*)"/);
            this._logger.debug('QUEUE: checkoutUrl: %j', checkoutUrl);

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
        const $ = cheerio.load(body, { xmlMode: false, normalizeWhitespace: true });
        const [checkoutUrl] = $('input[name="checkout_url"]');

        if (checkoutUrl && /checkouts/i.test(checkoutUrl)) {
          [redirectUrl] = checkoutUrl.split('?');
        }
      }
      this._logger.debug('QUEUE: RedirectUrl at end of fn body: %j', redirectUrl);
      if (redirectUrl && /checkouts/.test(redirectUrl)) {
        const [redirectNoQs] = redirectUrl.split('?');
        [, , , this.storeId, , this.checkoutToken] = redirectNoQs.split('/');

        if (type === Modes.FAST) {
          monitor.start();
        }
        return { queue: 'done' };
      }
      this._logger.silly('CHECKOUT: Not passed queue, delaying 2000 ms');
      const message = status ? `Not through queue! (${status})` : 'Not through queue!';
      return { message, delay: true, nextState: States.QUEUE };
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %s Request Error..\n Step: Poll Queue.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );
      const nextState = stateForError(err, {
        message: 'Polling queue',
        nextState: States.QUEUE,
      });

      const message =
        err.status || err.errno ? `Polling queue - (${err.status || err.errno})` : 'Polling queue';

      return nextState || { message, nextState: States.QUEUE };
    }
  }

  async paymentProcessing() {
    const {
      task: {
        site: { url, apiKey, name },
        product: { size, name: productName, url: productUrl },
        profile: { profileName },
        type,
        monitorDelay,
      },
      proxy,
      slack,
      discord,
    } = this._context;

    try {
      const res = await this._request(`${url}/wallets/checkouts/${this.checkoutToken}/payments`, {
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
              size,
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
              size,
              image: imageUrl,
            });
          } catch (err) {
            // fail silently...
          }
          const nextState = type === Modes.FAST ? States.COMPLETE_PAYMENT : States.GO_TO_PAYMENT;
          return { message: 'Card declined', nextState };
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
                size,
                image: imageUrl,
              });
            } catch (err) {
              // fail silently...
            }
            const nextState = type === Modes.FAST ? States.COMPLETE_PAYMENT : States.GO_TO_PAYMENT;
            return {
              message: `Out of stock! Delaying ${monitorDelay}ms`,
              nextState,
            };
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
              size,
              image: imageUrl,
            });
          } catch (err) {
            // fail silently...
          }
          const nextState = type === Modes.FAST ? States.COMPLETE_PAYMENT : States.GO_TO_PAYMENT;
          return { message: 'Payment failed!', nextState };
        }
      }
      this._logger.silly('CHECKOUT: Processing payment');
      return { message: 'Processing payment', delay: true, nextState: States.PROCESS_PAYMENT };
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %s Request Error..\n Step: Process Payment.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      if (/invalid json response/i.test(err.message)) {
        return {
          message: 'Processing payment',
          nextState: States.BACKUP_PROCESS_PAYMENT,
        };
      }

      const nextState = stateForError(err, {
        message: 'Processing payment',
        nextState: States.PROCESS_PAYMENT,
      });

      const message =
        err.status || err.errno
          ? `Processing payment - (${err.status || err.errno})`
          : 'Processing payment';

      return nextState || { message, nextState: States.PROCESS_PAYMENT };
    }
  }

  async backupPaymentProcessing() {
    const {
      task: {
        site: { url, apiKey },
      },
      proxy,
    } = this._context;

    try {
      const res = await this._request(
        `${url}/${this.storeId}/checkouts/${this.checkoutToken}/processing`,
        {
          method: 'GET',
          agent: proxy ? new HttpsProxyAgent(proxy) : null,
          redirect: 'manual',
          follow: 0,
          headers: {
            ...getHeaders({ url, apiKey }),
            'Content-Type': 'application/json',
            'Upgrade-Insecure-Requests': '1',
            'X-Shopify-Storefront-Access-Token': `${apiKey}`,
          },
        },
      );

      const { status, headers } = res;

      const checkStatus = stateForError(
        { status },
        {
          message: 'Processing payment',
          nextState: States.BACKUP_PROCESS_PAYMENT,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      const redirectUrl = headers.get('location');

      if (redirectUrl) {
        if (/thank_you/i.test(redirectUrl)) {
          return {
            message: `Payment successful!`,
            nextState: States.DONE,
          };
        }
      }

      const body = await res.text();

      if (/card declined/i.test(body)) {
        return {
          message: 'Card declined!',
          nextState: States.PAYMENT_TOKEN,
        };
      }

      if (/no match/i.test(body)) {
        return {
          message: 'Payment failed - No match',
          nextState: States.PAYMENT_TOKEN,
        };
      }

      if (/Your payment can’t be processed/i.test(body)) {
        return {
          message: 'Payment failed - Processing error',
          nextState: States.PAYMENT_TOKEN,
        };
      }

      this._logger.silly('CHECKOUT: Processing payment');
      return {
        message: 'Processing payment',
        delay: true,
        nextState: States.BACKUP_PROCESS_PAYMENT,
      };
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %s Request Error..\n Step: Process Payment.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Processing payment',
        nextState: States.BACKUP_PROCESS_PAYMENT,
      });

      const message =
        err.status || err.errno
          ? `Processing payment - (${err.status || err.errno})`
          : 'Processing payment';

      return nextState || { message, nextState: States.BACKUP_PROCESS_PAYMENT };
    }
  }
}

module.exports = Checkout;
