/* eslint-disable class-methods-use-this */
import HttpsProxyAgent from 'https-proxy-agent';

const cheerio = require('cheerio');
const { notification } = require('./hooks');
const { getHeaders, stateForError, userAgent } = require('./utils');
const { buildPaymentForm } = require('./utils/forms');
const { isSpecialSite } = require('./utils/siteOptions');
const { States, Events, Types, CheckoutTypes } = require('./utils/constants').TaskRunner;

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
    this.checkoutToken = null;
    this.checkoutKey = null;
    this.storeId = null;
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

  async addToCart() {
    throw new Error('Should be defined in subclasses');
  }

  async shippingRates() {
    throw new Error('Should be defined in subclasses');
  }

  async getPaymentToken() {
    const {
      task: {
        site: { apiKey },
        profile: { payment, billing },
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
          nextState: States.PaymentToken,
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
          return { message: 'Parsing Access Token', nextState: States.ParseAccessToken };
        }

        if (this._checkoutType === CheckoutTypes.fe) {
          return { message: 'Parsing products', nextState: States.Monitor };
        }
        return { message: 'Creating checkout', nextState: States.CreateCheckout };
      }
      return {
        message: 'Creating payment session',
        nextState: States.PaymentToken,
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
        nextState: States.PaymentToken,
      });

      const message = err.statusCode
        ? `Creating payment session - (${err.statusCode})`
        : 'Creating payment session';

      return nextState || { message, nextState: States.PaymentToken };
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
          message: 'Starting task setup',
          nextState: States.Login,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      const redirectUrl = headers.get('location');

      if (/password/i.test(redirectUrl)) {
        return { message: 'Password page', nextState: States.Login };
      }

      if (/challenge/i.test(redirectUrl)) {
        return { message: 'Captcha needed for login', nextState: States.RequestCaptcha };
      }

      if (/login/i.test(redirectUrl)) {
        return { message: 'Invalid account credentials', nextState: States.Errored };
      }

      if (/account/i.test(redirectUrl)) {
        this.needsLogin = false;
        if (this.storeId && this.checkoutToken) {
          if (!this.needsPatched) {
            if (this.chosenShippingMethod.id) {
              return { message: 'Posting payment', nextState: States.PostPayment };
            }
            return { message: 'Fetching shipping rates', nextState: States.ShippingRates };
          }
          return { message: 'Submitting information', nextState: States.PatchCheckout };
        }
        return { message: 'Fetching payment token', nextState: States.PaymentToken };
      }

      return { message: `Logging in (${status || 500})`, nextState: States.Login };
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %s Request Error..\n Step: Login.\n\n %j %j',
        err.statusCode,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Logging in',
        nextState: States.Login,
      });

      const message = err.statusCode ? `Logging in - (${err.statusCode})` : 'Logging in';
      return nextState || { message, nextState: States.Login };
    }
  }

  async parseAccessToken() {
    const {
      task: {
        site: { url },
      },
      proxy,
    } = this._context;

    this._logger.silly('API CHECKOUT: Parsing access token');
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
          message: 'Starting task setup',
          nextState: States.Login,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      const body = await res.text();

      const [, accessToken] = body.match(
        /<meta\s*name="shopify-checkout-api-token"\s*content="(.*)">/,
      );

      if (!accessToken) {
        return { message: 'Invalid Shopify Site', nextState: States.Stopped };
      }

      this._context.task.site.apiKey = accessToken;
      return { message: 'Creating checkout', nextState: States.CreateCheckout };
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %d Request Error..\n Step: Parse Access Token.\n\n %j %j',
        err.statusCode,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Parsing access token',
        nextState: States.ParseAccessToken,
      });

      const message = err.statusCode
        ? `Parsing access token - (${err.statusCode})`
        : 'Parsing access token';

      return nextState || { message, nextState: States.ParseAccessToken };
    }
  }

  async createCheckout() {
    const {
      task: {
        site: { url, apiKey },
      },
      proxy,
      timers: { monitor },
    } = this._context;

    try {
      const res = await this._request(`${url}/checkout`, {
        method: 'POST',
        agent: proxy ? new HttpsProxyAgent(proxy) : null,
        redirect: 'manual',
        headers: getHeaders({ url, apiKey }),
        body: JSON.stringify({}),
      });

      const { status } = res;

      const checkStatus = stateForError(
        { status },
        {
          message: 'Creating checkout',
          nextState: States.CreateCheckout,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      const redirectUrl = res.headers.get('location');
      this._logger.silly('Create checkout redirect url: %j', redirectUrl);

      if (redirectUrl) {
        if (redirectUrl.indexOf('password') > -1) {
          return { message: 'Password page', nextState: States.CreateCheckout };
        }

        if (redirectUrl.indexOf('throttle') > -1) {
          return { message: 'Waiting in queue', nextState: States.PollQueue };
        }

        if (redirectUrl.indexOf('checkouts') > -1) {
          [, , , this.storeId] = redirectUrl.split('/');
          [, , , , , this.checkoutToken] = redirectUrl.split('/');
          monitor.start();
          return { message: 'Submitting information', nextState: States.PatchCheckout };
        }
      }

      // not sure where we are, error out...
      const message = status ? `Creating checkout - (${status})` : 'Creating checkout';
      return { message, nextState: States.CreateCheckout };
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %d Request Error..\n Step: Create Checkout.\n\n %j %j',
        err.statusCode,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Creating checkout',
        nextState: States.CreateCheckout,
      });

      const message = err.statusCode
        ? `Creating checkout - (${err.statusCode})`
        : 'Creating checkout';

      return nextState || { message, nextState: States.CreateCheckout };
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
      },
      proxy,
      timers: { monitor },
    } = this._context;

    try {
      const res = await this._request('/checkout/poll', {
        method: 'GET',
        agent: proxy ? new HttpsProxyAgent(proxy) : null,
        redirect: 'manual',
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
          message: 'Waiting in queue',
          nextState: States.PollQueue,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      // check server error
      if (status === 400) {
        return { message: `Waiting in queue - (${status})`, nextState: States.PollQueue };
      }

      const ctd = await this.getCtdCookie(this._jar);
      const body = await res.text();

      this._logger.silly('CHECKOUT: %d: Queue response body: %j', status, body);

      let redirectUrl = null;
      if (status === 302) {
        redirectUrl = headers.get('location');
        if (redirectUrl && redirectUrl.indexOf('throttle') > -1) {
          return { message: `Waiting in queue - (${status})`, nextState: States.PollQueue };
        }
        if (redirectUrl && redirectUrl.indexOf('_ctd') > -1) {
          this._logger.silly('CTD COOKIE: %s', ctd);
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

            const [, checkoutUrl] = respBody.match(new RegExp('href=\\"(.*)\\"'));

            if (checkoutUrl && /checkouts/.test(checkoutUrl)) {
              [, , , this.storeId] = checkoutUrl.split('/');
              [, , , , , this.checkoutToken] = checkoutUrl.split('/');
              monitor.start();
              return { queue: 'done' };
            }
          } catch (e) {
            this._logger.error('Error with getting cookied checkout: %j', e);
          }
        }
        this._logger.silly('CHECKOUT: Polling queue redirect url %s...', redirectUrl);
      } else if (status === 200) {
        if (body === '' || (body && body.length < 2 && ctd)) {
          try {
            const response = await this._request(`https://${url}/throttle/queue?_ctd=${ctd}`, {
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

            const [, checkoutUrl] = respBody.match(/href="(.*)>"/);

            if (checkoutUrl) {
              [, , , this.storeId] = checkoutUrl.split('/');
              [, , , , , this.checkoutToken] = checkoutUrl.split('/');
              monitor.start();
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
        [, , , this.storeId] = redirectNoQs.split('/');
        [, , , , , this.checkoutToken] = redirectNoQs.split('/');

        monitor.start();
        return { queue: 'done' };
      }
      this._logger.silly('CHECKOUT: Not passed queue, delaying 2000 ms');
      const message = status ? `Waiting in queue - (${status})` : 'Waiting in queue';
      return { message, nextState: States.PollQueue };
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %s Request Error..\n Step: Poll Queue.\n\n %j %j',
        err.statusCode,
        err.message,
        err.stack,
      );
      const nextState = stateForError(err, {
        message: 'Waiting in queue',
        nextState: States.PollQueue,
      });

      const message = err.statusCode
        ? `Waiting in queue - (${err.statusCode})`
        : 'Waiting in queue';

      return nextState || { message, nextState: States.PollQueue };
    }
  }

  async pingCheckout() {
    const {
      task: {
        site: { url, apiKey },
      },
      timers: { monitor },
      proxy,
    } = this._context;

    // reset monitor timer in all cases
    monitor.stop();
    monitor.reset();

    try {
      const res = await this._request(`/${this.storeId}/checkouts/${this.checkoutToken}`, {
        method: 'GET',
        agent: proxy ? new HttpsProxyAgent(proxy) : null,
        redirect: 'manual',
        follow: 0,
        headers: {
          ...getHeaders({ url, apiKey }),
          Connection: 'Keep-Alive',
          'Upgrade-Insecure-Requests': '1',
          'X-Shopify-Storefront-Access-Token': `${apiKey}`,
        },
      });

      const { status, headers } = res;

      const checkStatus = stateForError(
        { status },
        {
          message: 'Pinging checkout',
          nextState: States.PingCheckout,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      const redirectUrl = headers.get('location');
      this._logger.silly('CHECKOUT: Pinging checkout redirect url: %s', redirectUrl);

      // check if redirected
      if (redirectUrl) {
        // processing
        if (redirectUrl.indexOf('password') > -1) {
          return { message: 'Password page', nextState: States.CreateCheckout };
        }

        if (redirectUrl.indexOf('throttle') > -1) {
          return { message: 'Waiting in queue', nextState: States.PollQueue };
        }
      }

      const body = await res.text();

      if (!this.checkoutKey) {
        const match = body.match(
          /<meta\s*name="shopify-checkout-authorization-token"\s*content="(.*)"/,
        );

        if (match) {
          [, this.checkoutKey] = match;
          this._logger.silly('CHECKOUT: Checkout authorization key: %j', this.checkoutKey);
        }
      }

      if (/captcha/.test(body)) {
        this.needsCaptcha = true;
      }

      if (this._context.task.isQueueBypass && !this.shouldContinue) {
        return { message: 'Submitting shipping', nextState: States.SubmitShipping };
      }

      if (this.checkoutType === CheckoutTypes.fe) {
        return { message: 'Submitting information', nextState: States.PatchCheckout };
      }

      // start the monitor timer again...
      monitor.start();
      return { message: 'Posting payment', nextState: States.PostPayment };
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %s Request Error..\n Step: Ping Checkout.\n\n %j %j',
        err.statusCode,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Pinging checkout',
        nextState: States.PingCheckout,
      });

      const message = err.statusCode
        ? `Pinging checkout - (${err.statusCode})`
        : 'Pinging checkout';

      return nextState || { message, nextState: States.PingCheckout };
    }
  }

  async submitShipping() {
    const {
      task: {
        site: { url, apiKey },
      },
      proxy,
    } = this._context;
    const { id } = this.chosenShippingMethod;

    const checkoutUrl = this.checkoutKey
      ? `/${this.storeId}/checkouts/${this.checkoutToken}?key=${this.checkoutKey}`
      : `/${this.storeId}/checkouts/${this.checkoutToken}`;

    try {
      const res = await this._request(checkoutUrl, {
        method: 'PATCH',
        agent: proxy ? new HttpsProxyAgent(proxy) : null,
        follow: 0,
        redirect: 'manual',
        headers: {
          ...getHeaders({ url, apiKey }),
          'Content-Type': 'application/json',
          'Upgrade-Insecure-Requests': '1',
          'X-Shopify-Storefront-Access-Token': `${apiKey}`,
        },
        body: JSON.stringify({
          complete: '1',
          checkout: {
            shipping_rate: {
              id,
            },
          },
        }),
      });

      const { status } = res;

      const checkStatus = stateForError(
        { status },
        {
          message: 'Submiting shipping',
          nextState: States.PostPayment,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      return { message: 'Bypass done. Stopping task!', status: 'bypassed', nextState: States.Finished };
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %s Request Error..\n Step: Submit Shipping.\n\n %j %j',
        err.statusCode,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Submitting shipping',
        nextState: States.SubmitShipping,
      });

      const message = err.statusCode
        ? `Submitting shipping - (${err.statusCode})`
        : 'Submitting shipping';

      return nextState || { message, nextState: States.SubmitShipping };
    }
  }

  async postPayment() {
    const {
      task: {
        site: { url, apiKey },
        sizes,
      },
      timers: { checkout },
      proxy,
    } = this._context;
    const { id } = this.chosenShippingMethod;

    const checkoutUrl = this.checkoutKey
      ? `/${this.storeId}/checkouts/${this.checkoutToken}?key=${this.checkoutKey}`
      : `/${this.storeId}/checkouts/${this.checkoutToken}`;

    let formBody = {
      complete: '1',
      s: this.paymentToken,
    };

    if (!this._context.task.isQueueBypass) {
      formBody = {
        ...formBody,
        checkout: {
          shipping_rate: {
            id,
          },
        },
      };
    }

    try {
      const res = await this._request(checkoutUrl, {
        method: 'PATCH',
        agent: proxy ? new HttpsProxyAgent(proxy) : null,
        follow: 0,
        redirect: 'manual',
        headers: {
          ...getHeaders({ url, apiKey }),
          'Content-Type': 'application/json',
          'Upgrade-Insecure-Requests': '1',
          'X-Shopify-Storefront-Access-Token': `${apiKey}`,
        },
        body: JSON.stringify(formBody),
      });

      const { status, headers } = res;

      const checkStatus = stateForError(
        { status },
        {
          message: 'Posting payment',
          nextState: States.PostPayment,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      const redirectUrl = headers.get('location');
      this._logger.silly('CHECKOUT: Post payment redirect url: %s', redirectUrl);

      // check if redirected
      if (redirectUrl) {
        if (redirectUrl.indexOf('processing') > -1) {
          this._context.task.checkoutSpeed = checkout.getRunTime();
          checkout.reset();
          checkout.start();
          return { message: 'Processing payment', nextState: States.PaymentProcess };
        }

        if (redirectUrl.indexOf('stock_problems') > -1) {
          if (this._checkoutType === CheckoutTypes.fe) {
            const nextState = sizes.includes('Random') ? States.Monitor : States.PostPayment;
            return { message: 'Running for restocks', nextState };
          }
          const nextState = sizes.includes('Random') ? States.Restocking : States.PostPayment;
          return { message: 'Running for restocks', nextState };
        }
      }

      const body = await res.text();
      if (this.needsCaptcha || /captcha/i.test(body)) {
        this._context.task.checkoutSpeed = checkout.getRunTime();
        checkout.stop();
        checkout.reset();
        return { message: 'Waiting for captcha', nextState: States.RequestCaptcha };
      }

      const match = body.match(/Shopify.Checkout.step\s*=\s*"(.*)"/);
      if (match && /review/.test(match)) {
        return { message: 'Completing payment', nextState: States.CompletePayment };
      }

      this._context.task.checkoutSpeed = checkout.getRunTime();
      checkout.stop();
      checkout.reset();
      return { message: 'Processing payment', nextState: States.PaymentProcess };
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %s Request Error..\n Step: Post Payment.\n\n %j %j',
        err.statusCode,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Posting payment',
        nextState: States.PostPayment,
      });

      const message = err.statusCode ? `Posting payment - (${err.statusCode})` : 'Posting payment';

      return nextState || { message, nextState: States.PostPayment };
    }
  }

  async completePayment() {
    const {
      task: {
        site: { url, apiKey },
        sizes,
        username,
        password,
      },
      timers: { checkout },
      proxy,
    } = this._context;

    try {
      const res = await this._request(`/${this.storeId}/checkouts/${this.checkoutToken}`, {
        method: 'PATCH',
        agent: proxy ? new HttpsProxyAgent(proxy) : null,
        redirect: 'manual',
        headers: {
          ...getHeaders({ url, apiKey }),
          'Content-Type': 'application/json',
          'Upgrade-Insecure-Requests': '1',
          'X-Shopify-Storefront-Access-Token': `${apiKey}`,
        },
        body: JSON.stringify({
          complete: '1',
          'g-recaptcha-response': this.captchaToken,
        }),
      });

      // Reset captcha token so we don't use it twice
      this.captchaToken = '';

      const { status, headers } = res;

      const checkStatus = stateForError(
        { status },
        {
          message: 'Processing payment',
          nextState: States.CompletePayment,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      const redirectUrl = headers.get('location');
      this._logger.silly('CHECKOUT: Complete payment redirect url: %s', redirectUrl);

      if (redirectUrl) {
        // processing
        if (redirectUrl.indexOf('processing') > -1) {
          checkout.reset();
          checkout.start();
          return { message: 'Processing payment', nextState: States.PaymentProcess };
        }

        // out of stock
        if (redirectUrl.indexOf('stock_problems') > -1) {
          if (this._checkoutType === CheckoutTypes.fe) {
            const nextState = sizes.includes('Random') ? States.Monitor : States.PostPayment;
            return { message: 'Running for restocks', nextState };
          }
          const nextState = sizes.includes('Random') ? States.Restocking : States.PostPayment;
          return { message: 'Running for restocks', nextState };
        }

        // login needed
        if (redirectUrl.indexOf('account') > -1) {
          if (username && password) {
            return { message: 'Logging in', nextState: States.Login };
          }
          return { message: 'Account required', nextState: States.Errored };
        }

        // password page
        if (redirectUrl.indexOf('password') > -1) {
          return { message: 'Password page', nextState: States.CreateCheckout };
        }
      }

      checkout.reset();
      checkout.start();
      return { message: 'Processing payment', nextState: States.PaymentProcess };
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %s Request Error..\n Step: Complete Payment.\n\n %j %j',
        err.statusCode,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Processing payment',
        nextState: States.CompletePayment,
      });

      const message = err.statusCode
        ? `Processing payment - (${err.statusCode})`
        : 'Processing payment';

      return nextState || { message, nextState: States.CompletePayment };
    }
  }

  async paymentProcessing() {
    const {
      task: {
        site: { url, apiKey, name },
        product: { chosenSizes, name: productName, url: productUrl, image },
        profile: { profileName },
        checkoutSpeed,
      },
      timers: { checkout },
      proxy,
      slack,
      discord,
      id,
    } = this._context;

    if (checkout.getRunTime() > 20000) {
      return { message: 'Processing timed out, check email', nextState: States.Finished };
    }

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
          nextState: States.PaymentProcess,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      const { payments } = body;

      if (payments.length) {
        const bodyString = JSON.stringify(payments[0]);

        this._logger.silly('CHECKOUT: Payments object: %j', payments[0]);
        // success
        if (bodyString.indexOf('thank_you') > -1) {
          const {
            checkout: {
              order: { name: orderName, status_url: statusUrl },
            },
          } = payments[0];
          const { total } = this.prices;

          try {
            await notification(slack, discord, {
              success: true,
              product: {
                name: productName,
                url: productUrl,
              },
              price: total,
              site: { name, url },
              order: {
                number: orderName || 'None',
                url: statusUrl,
              },
              profile: profileName,
              sizes: chosenSizes,
              checkoutSpeed,
              shippingMethod: this.chosenShippingMethod.id,
              logger: `runner-${id}.log`,
              image,
            });
          } catch (err) {
            // fail silently...
          }

          return {
            message: `Payment successful! Order ${orderName}`,
            order: { number: orderName, url: statusUrl },
            nextState: States.Finished,
          };
        }

        if (/your card was declined/i.test(bodyString)) {
          return { message: 'Card declined', nextState: States.Stopped };
        }

        const { payment_processing_error_message: paymentProcessingErrorMessage } = payments[0];

        if (paymentProcessingErrorMessage !== null) {
          // TODO: temporary stop special parsers from entering restock mode
          if (isSpecialSite({ name, url })) {
            return { message: 'Payment failed', nextState: States.Stopped };
          }

          if (paymentProcessingErrorMessage.indexOf('Some items are no longer available') > -1) {
            // TODO : restock mode...
            return { message: 'Payment failed (OOS)', nextState: States.Stopped };
          }

          // TODO : restock mode...
          return { message: 'Payment failed', nextState: States.Stopped };
        }
      }
      this._logger.silly('CHECKOUT: Processing payment');
      return { message: 'Processing payment', nextState: States.PaymentProcess };
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %s Request Error..\n Step: Process Payment.\n\n %j %j',
        err.statusCode,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Processing payment',
        nextState: States.PaymentProcess,
      });

      const message = err.statusCode
        ? `Processing payment - (${err.statusCode})`
        : 'Processing payment';

      return nextState || { message, nextState: States.PaymentProcess };
    }
  }
}

module.exports = Checkout;
