/* eslint-disable class-methods-use-this */
const cheerio = require('cheerio');
const { notification } = require('./hooks');
const {
  formatProxy,
  getHeaders,
  stateForError,
  stateForStatusCode,
  userAgent,
  waitForDelay,
} = require('./utils');
const { States, Types } = require('./utils/constants').TaskRunner;

class Checkout {
  constructor(context) {
    this._context = context;
    this._logger = this._context.logger;
    this._request = this._context.request;

    this.shippingMethods = [];
    const preFetchedShippingRates = this._context.task.profile.rates.find(
      r => r.site.url === this._context.task.site.url,
    );

    if (
      this._context.type === Types.Normal &&
      preFetchedShippingRates &&
      preFetchedShippingRates.selectedRate
    ) {
      const { name, rate } = preFetchedShippingRates.selectedRate;
      this.chosenShippingMethod = {
        name,
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

    this.storeId = null;
    this.prices = {
      item: 0,
      shipping: 0,
      total: 0,
    };

    this.selectedShippingRate = null;
    this.captchaToken = '';
    this.needsCaptcha = false;
    this.captchaTokenRequest = null;
  }

  // MARK : Methods defined in subclasses

  async paymentToken() {
    throw new Error('Should be defined in subclasses');
  }

  async addToCart() {
    throw new Error('Should be defined in subclasses');
  }

  async shippingRates() {
    throw new Error('Should be defined in subclasses');
  }

  // MARK : Shared super class methods

  async login() {
    const { site, username, password, monitorDelay } = this._context.task;
    const { url } = site;

    let form;
    let heads = {
      'User-Agent': userAgent,
      Connection: 'keep-alive',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    if (this.captchaToken) {
      form = {
        utf8: '✓',
        authenticity_token: '',
        'g-recaptcha-response': this.captchaToken,
      };
      heads = {
        ...heads,
        Referer: `${url}/challenge`,
      };
    } else {
      form = {
        form_data: 'customer_login',
        utf8: '✓',
        'customer[email]': username,
        'customer[password]': password,
        Referer: `${url}/account/login`,
      };
    }
    // Reset captcha token so we don't reuse it
    this.captchaToken = null;

    try {
      const res = await this._request({
        uri: `${url}/account/login`,
        method: 'POST',
        proxy: formatProxy(this._context.proxy),
        rejectUnauthorized: false,
        followAllRedirects: false,
        resolveWithFullResponse: true,
        simple: false,
        headers: heads,
        formData: form,
      });

      const { statusCode, headers } = res;
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      // check server error
      if (statusCode === 500 || statusCode === 503) {
        return { message: 'Starting task setup', nextState: States.Login };
      }

      const redirectUrl = headers.location;
      this._logger.silly('CHECKOUT: Login redirect url: %s', redirectUrl);

      if (redirectUrl) {
        // password page
        if (redirectUrl.indexOf('password') > -1) {
          await waitForDelay(monitorDelay);
          return { message: 'Password page', nextState: States.Login };
        }

        // challenge page
        if (redirectUrl.indexOf('challenge') > -1) {
          this._logger.silly('CHECKOUT: Login needs captcha');
          return { message: 'Captcha needed for login', nextState: States.RequestCaptcha };
        }

        // still at login page
        if (redirectUrl.indexOf('login') > -1) {
          this._logger.silly('CHECKOUT: Invalid login credentials');
          return { message: 'Invalid login credentials', nextState: States.Errored };
        }

        // since we're here, we can assume `account/login` === false
        if (redirectUrl.indexOf('account') > -1) {
          this._logger.silly('CHECKOUT: Logged in');
          // check to see if we already have the storeId and checkoutToken.
          if (this.storeId && this.checkoutToken) {
            return { message: 'Submitting information', nextState: States.PatchCheckout };
          }
          return { message: 'Fetching payment token', nextState: States.PaymentToken };
        }
      }

      return { message: 'Failed: Logging in', nextState: States.Errored };
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %d Request Error..\n Step: Login.\n\n %j %j',
        err.statusCode,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Starting task setup',
        nextState: States.Login,
      });

      return nextState || { message: 'Failed: Logging in', nextState: States.Errored };
    }
  }

  async createCheckout() {
    const { site, monitorDelay } = this._context.task;
    const { url, localCheckout = false } = site;

    try {
      const res = await this._request({
        uri: `${url}/checkout`,
        method: 'POST',
        proxy: localCheckout ? undefined : formatProxy(this._context.proxy),
        rejectUnauthorized: false,
        followAllRedirects: false,
        resolveWithFullResponse: true,
        simple: false,
        json: false,
        headers: getHeaders(site),
        body: JSON.stringify({}),
      });

      const { statusCode, headers } = res;
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      // check server error
      if (statusCode === 500 || statusCode === 503) {
        return { message: 'Creating checkout', nextState: States.CreateCheckout };
      }

      // TODO - test this more.
      // On stores with password page it makes sense, but idk if it will mess with anything else..
      if (statusCode === 401) {
        await waitForDelay(monitorDelay);
        return { message: 'Password page', nextState: States.CreateCheckout };
      }

      const [redirectUrl, qs] = headers.location.split('?');
      this._logger.silly('CHECKOUT: Create checkout redirect url: %s', redirectUrl);
      if (!redirectUrl) {
        return { message: 'Failed: Creating checkout', nextState: States.Errored };
      }

      // account (e.g. – https://www.hanon-shop.com/account/login?checkout_url=https%3A%2F%2Fwww.hanon-shop.com%2F20316995%2Fcheckouts%2Fb92b2aa215abfde741a8cf0e99eeee01)
      if (redirectUrl.indexOf('account') > -1) {
        // try to parse out the query string
        if (qs && qs.indexOf('checkout_url') > -1) {
          const [, checkoutUrl] = qs.split('=');
          const decodedCheckoutUrl = decodeURIComponent(checkoutUrl);
          [, , , this.storeId] = decodedCheckoutUrl.split('/');
          [, , , , , this.checkoutToken] = decodedCheckoutUrl.split('/');
        }

        if (this._context.task.username && this._context.task.password) {
          this._context.timers.monitor.start();
          return { message: 'Logging in', nextState: States.Login };
        }
        return { message: 'Account required', nextState: States.Errored };
      }

      if (redirectUrl.indexOf('stock_problems') > -1) {
        await waitForDelay(monitorDelay);
        return { message: 'Running for restocks', nextState: States.Restocking };
      }

      // password page
      if (redirectUrl.indexOf('password') > -1) {
        await waitForDelay(monitorDelay);
        return { message: 'Password page', nextState: States.CreateCheckout };
      }

      // queue
      if (redirectUrl.indexOf('throttle') > -1) {
        await waitForDelay(monitorDelay);
        return { message: 'Waiting in queue', nextState: States.PollQueue };
      }

      // successful checkout created, parse it
      if (redirectUrl.indexOf('checkouts') > -1) {
        [, , , this.storeId] = redirectUrl.split('/');
        [, , , , , this.checkoutToken] = redirectUrl.split('/');
        this._context.timers.monitor.start();
        return { message: 'Submitting information', nextState: States.PatchCheckout };
      }

      // not sure where we are, stop...
      return { message: 'Failed: Creating checkout', nextState: States.Errored };
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
      return nextState || { message: 'Failed: Creating checkout', nextState: States.Errored };
    }
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
    const { site } = this._context.task;
    const { url } = site;

    try {
      const res = await this._request({
        uri: `${url}/checkout/poll`,
        method: 'GET',
        proxy: formatProxy(this._context.proxy),
        rejectUnauthorized: false,
        followRedirect: false,
        resolveWithFullResponse: true,
        simple: false,
        json: false,
        headers: {
          ...getHeaders(site),
          'Upgrade-Insecure-Requests': 1,
          'x-barba': 'yes',
        },
      });

      const { statusCode, body, headers } = res;
      this._logger.silly('Checkout: poll response %d', statusCode);
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      // check server error
      if (statusCode === 400) {
        return { message: 'Failed: Invalid queue', nextState: States.Errored };
      }

      // check server error
      if (statusCode === 500 || statusCode === 503) {
        return { message: 'Polling queue', nextState: States.PollQueue };
      }

      this._logger.silly('CHECKOUT: %d: Queue response body: %j', statusCode, body);

      let redirectUrl;

      // check redirect header `location` parameter
      if (statusCode === 302) {
        [redirectUrl] = headers.location.split('?');
        if (redirectUrl) {
          [, , , this.storeId] = redirectUrl.split('/');
          [, , , , , this.checkoutToken] = redirectUrl.split('/');
          this._context.timers.monitor.start();
          // next state handled by poll queue map
          return { queue: 'done' };
        }
      } else if (statusCode === 200) {
        const $ = cheerio.load(body, { xmlMode: true, normalizeWhitespace: true });
        [redirectUrl] = $('input[name="checkout_url"]')
          .val()
          .split('?');
        if (redirectUrl) {
          [, , , this.storeId] = redirectUrl.split('/');
          [, , , , , this.checkoutToken] = redirectUrl.split('/');
          this._context.timers.monitor.start();
          // next state handled by poll queue map
          return { queue: 'done' };
        }
      }
      this._logger.silly('CHECKOUT: Not passed queue, delaying 2000 ms');
      await waitForDelay(2000);
      return { message: 'Waiting in queue', nextState: States.PollQueue };
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %d Request Error..\n Step: Poll Queue.\n\n %j %j',
        err.statusCode,
        err.message,
        err.stack,
      );
      const nextState = stateForError(err, {
        message: 'Waiting in queue',
        nextState: States.PollQueue,
      });
      return nextState || { message: 'Failed: Polling queue', nextState: States.Errored };
    }
  }

  async pingCheckout() {
    const {
      timers: { monitor: monitorTimer },
    } = this._context;
    const { site } = this._context.task;
    const { url, apiKey } = site;

    // reset monitor timer in all cases
    monitorTimer.stop();
    monitorTimer.reset();

    try {
      const res = await this._request({
        uri: `${url}/${this.storeId}/checkouts/${this.checkoutToken}`,
        method: 'GET',
        proxy: formatProxy(this._context.proxy),
        rejectUnauthorized: false,
        followAllRedirects: false,
        resolveWithFullResponse: true,
        simple: false,
        gzip: true,
        headers: {
          ...getHeaders(site),
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'Keep-Alive',
          'Upgrade-Insecure-Requests': '1',
          'X-Shopify-Storefront-Access-Token': `${apiKey}`,
        },
      });

      const { statusCode, headers } = res;
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      if (statusCode === 500 || statusCode === 503) {
        return { message: 'Pinging checkout', nextState: States.PingCheckout };
      }

      const redirectUrl = headers.location;
      this._logger.silly('CHECKOUT: Pinging checkout redirect url: %s', redirectUrl);

      // check if redirected
      if (redirectUrl) {
        // processing
        if (redirectUrl.indexOf('password') > -1) {
          return { message: 'Password page', nextState: States.CreateCheckout };
        }
      }

      // start the monitor timer again...
      monitorTimer.start();
      return { message: 'Monitoring for product' };
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %d Request Error..\n Step: Ping Checkout.\n\n %j %j',
        err.statusCode,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Pinging checkout',
        nextState: States.PingCheckout,
      });
      return (
        nextState || { message: 'Failed: Refreshing checkout session', nextState: States.Errored }
      );
    }
  }

  async postPayment() {
    const {
      timers: { checkout: checkoutTimer },
    } = this._context;
    const { site, monitorDelay } = this._context.task;
    const { url, apiKey, localCheckout = false } = site;
    const { id } = this.chosenShippingMethod;

    try {
      const res = await this._request({
        uri: `${url}/${this.storeId}/checkouts/${this.checkoutToken}`,
        method: 'PATCH',
        proxy: localCheckout ? undefined : formatProxy(this._context.proxy),
        rejectUnauthorized: false,
        followAllRedirects: false,
        resolveWithFullResponse: true,
        simple: false,
        gzip: true,
        headers: {
          ...getHeaders(site),
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'Keep-Alive',
          'Upgrade-Insecure-Requests': '1',
          'X-Shopify-Storefront-Access-Token': `${apiKey}`,
        },
        body: JSON.stringify({
          complete: '1',
          s: this.paymentToken,
          checkout: {
            shipping_rate: {
              id,
            },
          },
        }),
      });

      const { statusCode, body, headers } = res;
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      if (statusCode === 500 || statusCode === 503) {
        return { message: 'Posting payment', nextState: States.PostPayment };
      }

      const redirectUrl = headers.location;
      this._logger.silly('CHECKOUT: Post payment redirect url: %s', redirectUrl);

      // check if redirected
      if (redirectUrl) {
        // processing
        if (redirectUrl.indexOf('processing') > -1) {
          this._context.task.checkoutSpeed = checkoutTimer.getRunTime();
          checkoutTimer.reset();
          checkoutTimer.start();
          return { message: 'Processing payment', nextState: States.PaymentProcess };
        }

        // out of stock
        if (redirectUrl.indexOf('stock_problems') > -1) {
          await waitForDelay(monitorDelay);
          return { message: 'Running for restocks', nextState: States.Restocking };
        }
      }

      // check if captcha is present
      const $ = cheerio.load(body, { xmlMode: true, normalizeWhitespace: true });
      const recaptcha = $('.g-recaptcha');
      this._logger.silly('CHECKOUT: Recaptcha frame present: %s', recaptcha.length > 0);
      if (recaptcha.length > 0 || url.indexOf('socialstatus') > -1 || this.needsCaptcha) {
        this._context.task.checkoutSpeed = checkoutTimer.getRunTime();
        return { message: 'Waiting for captcha', nextState: States.RequestCaptcha };
      }

      this._context.task.checkoutSpeed = checkoutTimer.getRunTime();
      checkoutTimer.reset();
      return { message: 'Processing payment', nextState: States.CompletePayment };
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %d Request Error..\n Step: Post Payment.\n\n %j %j',
        err.statusCode,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Posting payment',
        nextState: States.PostPayment,
      });
      return nextState || { message: 'Failed: Posting payment', nextState: States.Errored };
    }
  }

  async completePayment() {
    const {
      timers: { checkout: checkoutTimer },
    } = this._context;
    const { site, monitorDelay } = this._context.task;
    const { url, apiKey, localCheckout = false } = site;

    try {
      const res = await this._request({
        uri: `${url}/${this.storeId}/checkouts/${this.checkoutToken}`,
        method: 'PATCH',
        proxy: localCheckout ? undefined : formatProxy(this._context.proxy),
        rejectUnauthorized: false,
        followAllRedirects: false,
        resolveWithFullResponse: true,
        simple: false,
        gzip: true,
        headers: {
          ...getHeaders(site),
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'Keep-Alive',
          'Upgrade-Insecure-Requests': '1',
          'X-Shopify-Storefront-Access-Token': `${apiKey}`,
        },
        body: JSON.stringify({
          complete: '1',
          'g-recaptcha-response': this.captchaToken,
        }),
      });
      // Reset captcha token so we don't use it twice
      this.captchaToken = null;

      const { statusCode, headers } = res;
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      // check server error
      if (statusCode === 500 || statusCode === 503) {
        return { message: 'Processing payment', nextState: States.CompletePayment };
      }

      const redirectUrl = headers.location;
      this._logger.silly('CHECKOUT: Complete payment redirect url: %s', redirectUrl);

      if (redirectUrl) {
        // processing
        if (redirectUrl.indexOf('processing') > -1) {
          checkoutTimer.reset();
          checkoutTimer.start();
          return { message: 'Processing payment', nextState: States.PaymentProcess };
        }

        // out of stock
        if (redirectUrl.indexOf('stock_problems') > -1) {
          await waitForDelay(monitorDelay);
          // TODO - fix restock mode loopback check
          return { message: 'Running for restocks', nextState: States.Restocking };
        }

        // login needed
        if (redirectUrl.indexOf('account') > -1) {
          if (this._context.task.username && this._context.task.password) {
            return { message: 'Logging in', nextState: States.Login };
          }
          return { message: 'Account required', nextState: States.Errored };
        }

        // password page
        if (redirectUrl.indexOf('password') > -1) {
          return { message: 'Password page', nextState: States.CreateCheckout };
        }
      }

      checkoutTimer.reset();
      checkoutTimer.start();
      return { message: 'Processing payment', nextState: States.PaymentProcess };
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %d Request Error..\n Step: Complete Payment.\n\n %j %j',
        err.statusCode,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Processing payment',
        nextState: States.CompletePayment,
      });
      return nextState || { message: 'Failed: Posting payment review', nextState: States.Errored };
    }
  }

  async paymentProcessing() {
    const {
      timers: { checkout: checkoutTimer },
      slack,
      discord,
      id,
    } = this._context;
    const { site, product, profile, checkoutSpeed } = this._context.task;
    const { profileName } = profile;
    const { chosenSizes } = product;
    const { url, apiKey, name } = site;

    if (checkoutTimer.getRunTime() > 20000) {
      return { message: 'Processing timed out, check email', nextState: States.Finished };
    }

    try {
      const res = await this._request({
        uri: `${url}/api/checkouts/${this.checkoutToken}/payments`,
        method: 'GET',
        proxy: formatProxy(this._context.proxy),
        rejectUnauthorized: false,
        resolveWithFullResponse: true,
        simple: false,
        json: true,
        gzip: true,
        headers: {
          ...getHeaders(site),
          'Accept-Encoding': 'gzip, deflate',
          'Accept-Language': 'en-GB,en-US;en;q=0.8',
          Connection: 'keep-alive',
          'Content-Type': 'application/json',
          'Upgrade-Insecure-Requests': '1',
          'X-Shopify-Storefront-Access-Token': `${apiKey}`,
        },
      });

      const { statusCode, body } = res;
      const checkStatus = stateForStatusCode(statusCode);
      if (checkStatus) {
        return checkStatus;
      }

      // check server error
      if (statusCode === 500 || statusCode === 503) {
        return { message: 'Processing payment', nextState: States.PaymentProcess };
      }

      const { payments } = body;

      if (body && payments.length > 0) {
        const bodyString = JSON.stringify(payments[0]);

        this._logger.silly('CHECKOUT: Payments object: %j', body.payments[0]);
        // success
        if (bodyString.indexOf('thank_you') > -1) {
          const { order } = payments[0].checkout;
          const { total } = this.prices;

          try {
            await notification(slack, discord, {
              success: true,
              product: {
                name: product.name,
                url: product.url,
              },
              price: total,
              site: { name, url },
              order: {
                number: order.name || 'None',
                url: order.status_url,
              },
              profile: profileName,
              sizes: chosenSizes,
              checkoutSpeed,
              shippingMethod: this.chosenShippingMethod.id,
              logger: `runner-${id}.log`,
              image: product.image,
            });
          } catch (err) {
            this._logger.error(
              'CHECKOUT: %d Request Error..\n Step: Send Webhooks.\n\n %j %j',
              err.statusCode,
              err.message,
              err.stack,
            );
          }
          return { message: 'Payment successful', nextState: States.Finished };
        }

        const { payment_processing_error_message: paymentProcessingErrorMessage } = payments[0];

        if (paymentProcessingErrorMessage !== null) {
          // out of stock during payment processing
          if (paymentProcessingErrorMessage.indexOf('Some items are no longer available') > -1) {
            return { message: 'Payment failed (OOS)', nextState: States.Finished };
          }

          // generic payment processing failure
          return { message: 'Payment failed', nextState: States.Errored };
        }
      }
      this._logger.silly('CHECKOUT: Processing payment');
      await waitForDelay(2000);
      return { message: 'Processing payment', nextState: States.PaymentProcess };
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %d Request Error..\n Step: Process Payment.\n\n %j %j',
        err.statusCode,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Processing payment',
        nextState: States.PaymentProcess,
      });
      return nextState || { message: 'Failed: Processing payment', nextState: States.Errored };
    }
  }
}

module.exports = Checkout;
