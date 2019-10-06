/* eslint-disable array-callback-return */
import cheerio from 'cheerio';
import { min } from 'lodash';
import { parse } from 'query-string';
import CheckoutPrimitive from '../checkout';

const { States, Modes } = require('../utils/constants').TaskRunner;
const { ParseType } = require('../utils/constants').Monitor;
const { userAgent } = require('../../../common');
const { stateForError, getHeaders } = require('../utils');
const { addToCart, patchCheckoutForm, parseForm } = require('../utils/forms');
const pickVariant = require('../utils/pickVariant');

class SafeCheckout extends CheckoutPrimitive {
  constructor(context, type = Modes.SAFE) {
    super(context, type);
    this.formValues = '';
    this.checkpointForm = '';

    this.isFreeCheckout = false;
  }

  async addToCart() {
    const {
      task: {
        site: { name, url },
        product: { variants, barcode, hash, restockUrl, randomInStock },
        size,
        monitorDelay,
      },
      proxy,
      parseType,
    } = this._context;

    if (/dsm sg|dsm jp|dsm uk/i.test(name)) {
      return this.backupAddToCart();
    }

    let properties = {};

    if (barcode) {
      properties = {
        ...properties,
        barcode: barcode[0],
      };
    }

    let variant;
    if (parseType !== ParseType.Variant) {
      variant = await pickVariant(variants, size, url, this._logger, randomInStock);
    } else {
      [variant] = variants;
    }

    if (!variant) {
      return {
        message: 'No size matched! Stopping...',
        nextState: States.ERROR,
      };
    }

    const { option, id } = variant;

    this._context.task.product.size = option;

    try {
      const res = await this._request('/cart/add.js', {
        method: 'POST',
        compress: true,
        agent: proxy,
        headers: {
          origin: url,
          host: `${url.split('/')[2]}`,
          'accept-encoding': 'gzip, deflate, br',
          'accept-language': 'en-US,en;q=0.9',
          'user-agent': userAgent,
          Accept: 'application/json,text/javascript,*/*;q=0.01',
          referer: restockUrl,
          'content-type': /eflash/i.test(url)
            ? 'application/x-www-form-urlencoded'
            : 'application/json',
        },
        body: addToCart(id, name, hash, properties),
      });

      const { status, headers } = res;

      const checkStatus = stateForError(
        { status },
        {
          message: 'Adding to cart',
          nextState: States.ADD_TO_CART,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      const redirectUrl = headers.get('location');
      this._logger.silly('FRONTEND CHECKOUT: Add to cart redirect url: %s', redirectUrl);

      if (redirectUrl) {
        if (/checkpoint/i.test(redirectUrl)) {
          return { message: 'Going to checkpoint', nextState: States.GO_TO_CHECKPOINT };
        }

        if (/stock_problems/i.test(redirectUrl)) {
          return {
            message: `Out of stock! Delaying ${monitorDelay}ms`,
            delay: true,
            nextState: States.ADD_TO_CART,
          };
        }

        if (/password/i.test(redirectUrl)) {
          return { message: 'Password page', delay: true, nextState: States.ADD_TO_CART };
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
              compress: true,
              agent: proxy,
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
      }

      const body = await res.text();

      if (/cannot find variant/i.test(body)) {
        this._emitTaskEvent({ message: `Variant not live, delaying ${monitorDelay}ms` });
        return {
          message: `Variant not live, delaying ${monitorDelay}ms`,
          delay: true,
          nextState: States.ADD_TO_CART,
        };
      }

      const { price } = body;

      if (price) {
        this.prices.item = price;
      }

      return { message: 'Going to cart', nextState: States.GO_TO_CART };
    } catch (err) {
      this._logger.error(
        'FRONTEND CHECKOUT: %s Request Error..\n Step: Add to Cart.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );
      const nextState = stateForError(err, {
        message: 'Adding to cart',
        nextState: States.ADD_TO_CART,
      });

      const message =
        err.status || err.errno
          ? `Adding to cart - (${err.status || err.errno})`
          : 'Adding to cart';

      return nextState || { message, nextState: States.ADD_TO_CART };
    }
  }

  async backupAddToCart() {
    const {
      task: {
        site: { url, name, apiKey },
        product: { variants, hash, randomInStock },
        size,
        monitorDelay,
      },
      proxy,
      timers: { checkout: checkoutTimer },
      parseType,
    } = this._context;

    let variant;
    if (parseType !== ParseType.Variant) {
      variant = await pickVariant(variants, size, url, this._logger, randomInStock);
    } else {
      [variant] = variants;
    }

    if (!variant) {
      return {
        message: 'No size matched! Stopping...',
        nextState: States.ERROR,
      };
    }

    const { option, id } = variant;

    this._context.task.product.size = option;

    let opts = {};
    const base = {
      checkout: {
        line_items: [
          {
            variant_id: id,
            quantity: '1',
            properties: /dsm uk/i.test(name)
              ? {
                  _hash: hash,
                }
              : {},
          },
        ],
      },
    };

    if (this.chosenShippingMethod.id) {
      opts = {
        shipping_rate: {
          id: this.chosenShippingMethod.id,
        },
      };
    }

    try {
      const res = await this._request(`/wallets/checkouts/${this.checkoutToken}.json`, {
        method: 'PATCH',
        compress: true,
        agent: proxy,
        headers: {
          ...getHeaders({ url, apiKey }),
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          ...base,
          checkout: {
            ...base.checkout,
            ...opts,
          },
        }),
      });

      const { status, headers } = res;

      const checkStatus = stateForError(
        { status },
        {
          message: 'Adding to cart',
          nextState: States.ADD_TO_CART,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      const redirectUrl = headers.get('location');
      this._logger.silly('API CHECKOUT: Add to cart redirect url: %s', redirectUrl);

      // check redirects
      if (redirectUrl) {
        if (/checkpoint/i.test(redirectUrl)) {
          return { message: 'Going to checkpoint', nextState: States.GO_TO_CHECKPOINT };
        }

        if (/password/i.test(redirectUrl)) {
          return { message: 'Password page', delay: true, nextState: States.ADD_TO_CART };
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
              compress: true,
              agent: proxy,
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
      }

      const body = await res.json();

      if (body.errors && body.errors.line_items) {
        const error = body.errors.line_items[0];
        this._logger.silly('Error adding to cart: %j', error);
        if (error && error.quantity) {
          return {
            message: `Out of stock! Delaying ${monitorDelay}ms`,
            delay: true,
            nextState: States.ADD_TO_CART,
          };
          // return { message: `Out of stock! Delaying ${monitorDelay}ms`, nextState: States. };
        }
        if (error && error.variant_id[0]) {
          return {
            message: `Variant not found! Delaying ${monitorDelay}ms`,
            delay: true,
            nextState: States.ADD_TO_CART,
          };
        }

        const message = status ? `Adding to cart – (${status})` : 'Adding to cart';
        return { message, nextState: States.ADD_TO_CART };
      }

      if (body.checkout && body.checkout.line_items && body.checkout.line_items.length) {
        const { total_price: totalPrice } = body.checkout;

        this._context.task.product.name = body.checkout.line_items[0].title;
        this._context.task.product.image = body.checkout.line_items[0].image_url.startsWith('http')
          ? body.checkout.line_items[0].image_url
          : `http:${body.checkout.line_items[0].image_url}`;

        checkoutTimer.reset();
        checkoutTimer.start();

        this.prices.item = parseFloat(totalPrice).toFixed(2);

        if (this.chosenShippingMethod.id) {
          this._logger.silly('API CHECKOUT: Shipping total: %s', this.prices.shipping);
          this.prices.total = (
            parseFloat(this.prices.item) + parseFloat(this.chosenShippingMethod.price)
          ).toFixed(2);
          return { message: 'Submitting payment', nextState: States.PAYMENT_TOKEN };
        }
        return { message: 'Going to checkout', nextState: States.GO_TO_CHECKOUT };
      }
      const message = status ? `Adding to cart – (${status})` : 'Adding to cart';
      return { message, nextState: States.ADD_TO_CART };
    } catch (err) {
      this._logger.error(
        'API CHECKOUT: %s Request Error..\n Step: Add to Cart.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );
      const nextState = stateForError(err, {
        message: 'Adding to cart',
        nextState: States.ADD_TO_CART,
      });

      const message =
        err.status || err.errno
          ? `Adding to cart - (${err.status || err.errno})`
          : 'Adding to cart';

      return nextState || { message, nextState: States.ADD_TO_CART };
    }
  }

  async goToCheckout() {
    const {
      task: {
        site: { url, apiKey },
        forceCaptcha,
        monitorDelay,
      },
      timers: { monitor },
      proxy,
    } = this._context;

    // reset monitor timer
    monitor.stop();
    monitor.reset();

    try {
      const res = await this._request(`/${this.storeId}/checkouts/${this.checkoutToken}`, {
        method: 'GET',
        compress: true,
        agent: proxy,
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
          message: 'Going to checkout',
          nextState: States.GO_TO_CHECKOUT,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      const redirectUrl = headers.get('location');
      this._logger.silly('CHECKOUT: Get checkout redirect url: %s', redirectUrl);

      // check if redirected
      if (redirectUrl) {
        if (/checkpoint/i.test(redirectUrl)) {
          return { message: 'Going to checkpoint', nextState: States.GO_TO_CHECKPOINT };
        }

        if (/login/i.test(redirectUrl)) {
          return {
            message: 'Login needed! Stopping...',
            nextState: States.STOP,
          };
        }
        if (/cart/i.test(redirectUrl)) {
          return {
            message: `Out of stock! Delaying ${monitorDelay}ms`,
            delay: true,
            nextState: States.GO_TO_CHECKOUT,
          };
        }

        if (/password/i.test(redirectUrl)) {
          return { message: 'Password page', delay: true, nextState: States.GO_TO_CHECKOUT };
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
              compress: true,
              agent: proxy,
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

      if ((/captcha/i.test(body) || forceCaptcha) && !this.captchaToken) {
        this.needsCaptcha = true; // mark this to do later
      }

      if (this.chosenShippingMethod.id) {
        if (this.needsCaptcha) {
          return {
            message: 'Waiting for captcha',
            nextState: States.CAPTCHA,
          };
        }
        return {
          message: 'Submitting pament',
          nextState: States.SUBMIT_PAYMENT,
        };
      }

      return { message: 'Fetching shipping rates', nextState: States.GO_TO_SHIPPING };
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %s Request Error..\n Step: Ping Checkout.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Going to checkout',
        nextState: States.GO_TO_CHECKOUT,
      });

      const message =
        err.status || err.errno
          ? `Going to checkout - (${err.status || err.errno})`
          : 'Going to checkout';

      return nextState || { message, nextState: States.GO_TO_CHECKOUT };
    }
  }

  async shippingRates() {
    const {
      task: {
        site: { url, apiKey },
        monitorDelay,
      },
      proxy,
    } = this._context;

    try {
      const res = await this._request(
        `/wallets/checkouts/${this.checkoutToken}/shipping_rates.json`,
        {
          method: 'GET',
          compress: true,
          agent: proxy,
          headers: getHeaders({ url, apiKey }),
        },
      );

      const { status } = res;

      const checkStatus = stateForError(
        { status },
        {
          message: 'Fetching shipping rates',
          nextState: States.GO_TO_SHIPPING,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      // extra check for country not supported / cart error
      if (status === 422) {
        return { message: 'Country not supported', nextState: States.ERROR };
      }

      const body = await res.json();
      if (body && body.errors) {
        this._logger.silly('API CHECKOUT: Error getting shipping rates: %j', body.errors);
        const { checkout } = body.errors;
        if (checkout) {
          const errorMessage = JSON.stringify(checkout);
          if (errorMessage.indexOf('does_not_require_shipping') > -1) {
            this._logger.silly('API CHECKOUT: Cart empty, retrying add to cart');
            return { message: 'Adding to cart', nextState: States.ADD_TO_CART };
          }

          if (errorMessage.indexOf("can't be blank") > -1) {
            this._logger.silly('API CHECKOUT: Country not supported');
            return { message: 'Submitting information', nextState: States.SUBMIT_CUSTOMER };
          }
        }
        return { message: 'Polling shipping rates', delay: true, nextState: States.GO_TO_SHIPPING };
      }

      if (body && body.shipping_rates && body.shipping_rates.length > 0) {
        const { shipping_rates: shippingRates } = body;
        shippingRates.forEach(rate => {
          this.shippingMethods.push(rate);
        });

        const cheapest = min(this.shippingMethods, rate => rate.price);
        // Store cheapest shipping rate
        this.selectedShippingRate = cheapest;
        const { id, title } = cheapest;
        this.chosenShippingMethod = { id, name: title };
        this._logger.silly('API CHECKOUT: Using shipping method: %s', title);

        // set shipping price for cart
        this.prices.shipping = parseFloat(cheapest.price).toFixed(2);
        this.prices.total = (
          parseFloat(this.prices.item) + parseFloat(this.prices.shipping)
        ).toFixed(2);
        this._logger.silly('API CHECKOUT: Shipping total: %s', this.prices.shipping);
        if (this.needsCaptcha) {
          return { message: 'Waiting for captcha', nextState: States.CAPTCHA };
        }
        return { message: 'Submitting payment', nextState: States.SUBMIT_PAYMENT };
      }
      this._logger.silly('No shipping rates available, polling %d ms', monitorDelay);
      return { message: 'Polling shipping rates', delay: true, nextState: States.GO_TO_SHIPPING };
    } catch (err) {
      this._logger.error(
        'API CHECKOUT: %s Request Error..\n Step: Shipping Rates.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Fetching shipping rates',
        nextState: States.ShippingRates,
      });

      const message =
        err.status || err.errno
          ? `Fetching shipping rates - (${err.status || err.errno})`
          : 'Fetching shipping rates';

      return nextState || { message, nextState: States.ShippingRates };
    }
  }

  async getCart() {
    const {
      task: {
        site: { url, apiKey },
      },
      proxy,
    } = this._context;

    try {
      const res = await this._request(`${url}/cart`, {
        method: 'GET',
        compress: true,
        agent: proxy,
        redirect: 'manual',
        follow: 0,
        headers: {
          ...getHeaders({ url, apiKey }),
          Connection: 'Keep-Alive',
          'Upgrade-Insecure-Requests': '1',
          'X-Shopify-Storefront-Access-Token': `${apiKey}`,
          'sec-fetch-mode': 'navigate',
          'sec-fetch-site': 'same-origin',
          'sec-fetch-user': '?1',
        },
      });

      const { status, headers } = res;

      const checkStatus = stateForError(
        { status },
        {
          message: 'Going to cart',
          nextState: States.GO_TO_CART,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      const redirectUrl = headers.get('location');

      if (redirectUrl) {
        if (/checkpoint/i.test(redirectUrl)) {
          return { message: 'Going to checkpoint', nextState: States.GO_TO_CHECKPOINT };
        }

        if (/password/i.test(redirectUrl)) {
          return { message: 'Password page', delay: true, nextState: States.GO_TO_CART };
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
              compress: true,
              agent: proxy,
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
      }

      const body = await res.text();

      const $ = cheerio.load(body, {
        normalizeWhitespace: true,
        xmlMode: false,
      });

      $('form[action="/cart"], input, select, textarea, button').each((_, el) => {
        const name = $(el).attr('name');
        const value = $(el).attr('value') || '';

        this._logger.info('Cart form value detected: { name: %j, value: %j }', name, value);
        // Blacklisted values/names
        if (
          name &&
          !/q|g|gender|\$fields|email|subscribe|updates\[.*:.*]/i.test(name) &&
          !/update cart|Update|{{itemQty}}/i.test(value)
        ) {
          this.cartForm += `${name}=${value ? value.replace(/\s/g, '+') : ''}&`;
        }
      });

      if (this.cartForm.endsWith('&')) {
        this.cartForm = this.cartForm.slice(0, -1);
      }

      this._logger.info('Cart form parsed: %j', this.cartForm);

      if (this.needsLogin) {
        // we can assume that if we're here and need a login, it's due to us hitting `/challenge`
        return { message: 'Waiting for captcha', nextState: States.CAPTCHA };
      }
      return { message: 'Creating checkout', nextState: States.CREATE_CHECKOUT };
    } catch (err) {
      this._logger.error(
        'FRONTEND CHECKOUT: %s Request Error..\n Step: Submit customer .\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );
      const nextState = stateForError(err, {
        message: 'Going to cart',
        nextState: States.GO_TO_CART,
      });

      const message =
        err.status || err.errno ? `Going to cart - (${err.status || err.errno})` : 'Going to cart';

      return nextState || { message, nextState: States.GO_TO_CART };
    }
  }

  async createCheckout() {
    const {
      task: {
        site: { url, name, apiKey },
      },
      proxy,
    } = this._context;

    if (/dsm sg|dsm jp|dsm uk/i.test(name)) {
      return this.backupCreateCheckout();
    }

    if (!this.cartForm.includes('checkout')) {
      this.cartForm += `checkout=Check+out`;
    }

    try {
      const res = await this._request(`${url}/cart`, {
        method: 'POST',
        compress: true,
        agent: proxy,
        redirect: 'manual',
        follow: 0,
        headers: {
          ...getHeaders({ url, apiKey }),
          'content-type': 'application/x-www-form-urlencoded',
          accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
        },
        body: this.cartForm,
      });

      // reset cart form in case we need to parse it again...
      this.cartForm = '';
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
        if (/checkpoint/i.test(redirectUrl)) {
          return { message: 'Going to checkpoint', nextState: States.GO_TO_CHECKPOINT };
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
              compress: true,
              agent: proxy,
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
          if (/stock_problems/i.test(redirectUrl)) {
            this.outOfStock = true;
          }
          return { message: 'Going to checkout', nextState: States.GO_TO_CHECKOUT };
        }

        if (/cart/i.test(redirectUrl)) {
          return { message: 'Creating checkout', nextState: States.ADD_TO_CART };
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

  async getCheckpoint() {
    const {
      task: {
        site: { url, apiKey },
      },
      proxy,
    } = this._context;

    try {
      const res = await this._request(`/checkpoint`, {
        method: 'GET',
        compress: true,
        agent: proxy,
        redirect: 'manual',
        follow: 0,
        headers: getHeaders({ url, apiKey }),
      });

      const { status, headers } = res;

      const checkStatus = stateForError(
        { status },
        {
          message: 'Going to checkpoint',
          nextState: States.GO_TO_CHECKPOINT,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      const redirectUrl = headers.get('location');
      this._logger.debug('Checkpoint redirect url: %j', redirectUrl);

      if (redirectUrl) {
        if (/checkpoint/i.test(redirectUrl)) {
          return { message: 'Going to checkpoint', nextState: States.GO_TO_CHECKPOINT };
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
              compress: true,
              agent: proxy,
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
          return { message: 'Going to checkout', nextState: States.GO_TO_CHECKOUT };
        }
      }

      const body = await res.text();

      const $ = cheerio.load(body, { normalizeWhitespace: true, xmlMode: false });

      $('form[action="/checkpoint"] input, textarea, select, button').each((_, el) => {
        const name = $(el).attr('name');
        let value = $(el).attr('value') || '';

        if (/authenticity_token/i.test(name)) {
          value = encodeURIComponent(value);
        }

        if (/g-recaptcha-response/i.test(name)) {
          return;
        }
        this._logger.info('Checkpoint form value detected: { name: %j, value: %j }', name, value);

        if (name) {
          this.checkpointForm += `${name}=${value ? value.replace(/\s/g, '+') : ''}&`;
        }
      });

      if (this.checkpointForm.endsWith('&')) {
        this.checkpointForm = this.checkpointForm.slice(0, -1);
      }

      return { message: 'Waiting for captcha', nextState: States.CAPTCHA };
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %d Request Error..\n Step: Going to checkpoint.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Going to checkpoint',
        nextState: States.GO_TO_CHECKPOINT,
      });

      const message =
        err.status || err.errno
          ? `Going to checkpoint - (${err.status || err.errno})`
          : 'Going to checkpoint';

      return nextState || { message, nextState: States.GO_TO_CHECKPOINT };
    }
  }

  async submitCheckpoint() {
    const {
      task: {
        site: { url, apiKey },
      },
      proxy,
    } = this._context;

    if (this.captchaToken && !/g-recaptcha-response/i.test(this.checkpointForm)) {
      const parts = this.checkpointForm.split('&');
      if (parts && parts.length) {
        this.checkpointForm = '';
        await parts.map(part => {
          if (/authenticity_token/i.test(part)) {
            this.checkpointForm += `${part}&g-recaptcha-response=${this.captchaToken}&`;
          } else {
            this.checkpointForm += `${part}&`;
          }
        });
      }
    }

    if (this.checkpointForm.endsWith('&')) {
      this.checkpointForm = this.checkpointForm.slice(0, -1);
    }

    this._logger.debug('FORM: %j', this.checkpointForm);

    try {
      const res = await this._request(`/checkpoint`, {
        method: 'POST',
        compress: true,
        agent: proxy,
        redirect: 'manual',
        follow: 0,
        headers: {
          ...getHeaders({ url, apiKey }),
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: this.checkpointForm,
      });

      const { status, headers } = res;

      const checkStatus = stateForError(
        { status },
        {
          message: 'Submitting checkpoint',
          nextState: States.SUBMIT_CHECKPOINT,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      const redirectUrl = headers.get('location');
      this._logger.debug('Checkpoint redirect url: %j', redirectUrl);

      if (redirectUrl) {
        if (/checkpoint/i.test(redirectUrl)) {
          return { message: 'Going to checkpoint', nextState: States.GO_TO_CHECKPOINT };
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
              compress: true,
              agent: proxy,
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

        if (/cart/i.test(redirectUrl)) {
          return { message: 'Creating checkout', nextState: States.CREATE_CHECKOUT };
        }

        if (/checkouts/i.test(redirectUrl)) {
          [, , , this.storeId, , this.checkoutToken] = redirectUrl.split('/');
          return { message: 'Going to checkout', nextState: States.GO_TO_CHECKOUT };
        }
      }

      const message = status ? `Submitting checkpoint - (${status})` : 'Submitting checkpoint';
      return { message, nextState: States.SUBMIT_CHECKPOINT };
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %d Request Error..\n Step: Checkpoint.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Going to checkpoint',
        nextState: States.GO_TO_CHECKPOINT,
      });

      const message =
        err.status || err.errno
          ? `Going to checkpoint - (${err.status || err.errno})`
          : 'Going to checkpoint';

      return nextState || { message, nextState: States.GO_TO_CHECKPOINT };
    }
  }

  /**
   * Used by DSM UK/SG/JP to enter queue right away
   */
  async backupCreateCheckout() {
    const {
      task: {
        site: { url, apiKey },
      },
      proxy,
    } = this._context;

    try {
      const res = await this._request(`${url}/wallets/checkouts`, {
        method: 'POST',
        compress: true,
        agent: proxy,
        redirect: 'manual',
        follow: 0,
        headers: getHeaders({ url, apiKey }),
        body: JSON.stringify({
          card_source: 'vault',
          pollingOptions: {
            poll: false,
          },
          complete: '1',
          checkout: {
            secret: true,
            wallet_name: 'default',
          },
        }),
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
        if (/checkpoint/i.test(redirectUrl)) {
          return { message: 'Going to checkpoint', nextState: States.GO_TO_CHECKPOINT };
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
              compress: true,
              agent: proxy,
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
      }

      const body = await res.json();

      if (body && body.error) {
        if (/channel is locked/i.test(body.error)) {
          return { message: 'Password page', delay: true, nextState: States.CREATE_CHECKOUT };
        }
        return { message: 'Invalid checkout! Retrying..', nextState: States.CREATE_CHECKOUT };
      }

      if (body && body.checkout) {
        const { web_url: checkoutUrl } = body.checkout;
        if (/checkouts/i.test(checkoutUrl)) {
          [, , , this.storeId, , this.checkoutToken] = checkoutUrl.split('/');
          return { message: 'Submitting information', nextState: States.SUBMIT_CUSTOMER };
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

  async getCheckout(state, message, step) {
    const {
      task: {
        site: { url, apiKey },
        monitorDelay,
      },
      timers: { monitor },
      proxy,
    } = this._context;

    monitor.stop();
    monitor.reset();
    try {
      const res = await this._request(`/${this.storeId}/checkouts/${this.checkoutToken}`, {
        method: 'GET',
        compress: true,
        agent: proxy,
        redirect: 'manual',
        follow: 0,
        headers: {
          ...getHeaders({ url, apiKey }),
          Connection: 'Keep-Alive',
          'Upgrade-Insecure-Requests': '1',
          'X-Shopify-Storefront-Access-Token': apiKey,
          'sec-fetch-mode': 'navigate',
          'sec-fetch-site': 'same-origin',
          'sec-fetch-user': '?1',
        },
      });

      const { status, headers } = res;
      this.outOfStock = false;
      const checkStatus = stateForError(
        { status },
        {
          message,
          nextState: state,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      const body = await res.text();
      const $ = cheerio.load(body, {
        xmlMode: true,
        normalizeWhitespace: true,
        recognizeCDATA: true,
        ignoreWhitespace: true,
      });

      const priceRecap = $('.total-recap__final-price').attr('data-checkout-payment-due-target');

      // grab the checkoutKey if it's exists and we don't have it yet..
      if (!this.checkoutKey) {
        const match = body.match(
          /<meta\s*name="shopify-checkout-authorization-token"\s*content="(.*)"/,
        );

        if (match) {
          [, this.checkoutKey] = match;
          this._logger.silly('CHECKOUT: Checkout authorization key: %j', this.checkoutKey);
        }
      }

      const redirectUrl = headers.get('location');
      this._logger.silly(`CHECKOUT: ${state} redirect url: %s`, redirectUrl);

      // check if redirected
      if (redirectUrl) {
        if (/checkpoint/i.test(redirectUrl)) {
          return { message: 'Going to checkpoint', nextState: States.GO_TO_CHECKPOINT };
        }

        if (/password/i.test(redirectUrl)) {
          return { message: 'Password page', delay: true, nextState: state };
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
              compress: true,
              agent: proxy,
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

        if (/stock_problems/i.test(redirectUrl)) {
          let nextState = state;
          switch (state) {
            case States.GO_TO_CHECKOUT:
            case States.SUBMIT_CUSTOMER: {
              nextState = States.GO_TO_CHECKOUT;
              break;
            }
            case States.GO_TO_SHIPPING:
            case States.SUBMIT_SHIPPING: {
              nextState = States.GO_TO_SHIPPING;
              break;
            }
            case States.GO_TO_PAYMENT:
            case States.SUBMIT_PAYMENT: {
              nextState = States.GO_TO_PAYMENT;
              break;
            }
            default:
              break;
          }

          return {
            message: `Out of stock! Delaying ${monitorDelay}ms`,
            delay: true,
            nextState,
          };
        }

        if (/cart/i.test(redirectUrl)) {
          return { message: `Cart empty!`, nextState: States.ADD_TO_CART };
        }
      }

      if (/stock_problems/i.test(body)) {
        let nextState = state;
        switch (state) {
          case States.GO_TO_CHECKOUT:
          case States.SUBMIT_CUSTOMER: {
            nextState = States.GO_TO_CHECKOUT;
            break;
          }
          case States.GO_TO_SHIPPING:
          case States.SUBMIT_SHIPPING: {
            nextState = States.GO_TO_SHIPPING;
            break;
          }
          case States.GO_TO_PAYMENT:
          case States.SUBMIT_PAYMENT: {
            nextState = States.GO_TO_PAYMENT;
            break;
          }
          default:
            break;
        }

        return {
          message: `Out of stock! Delaying ${monitorDelay}ms`,
          delay: true,
          nextState,
        };
      }

      if (/Getting available shipping rates/i.test(body)) {
        return { message: 'Polling shipping rates', nextState: States.GO_TO_SHIPPING };
      }

      if (/calculating taxes/i.test(body) || /polling/i.test(body)) {
        return { message: 'Calculating taxes', nextState: States.GO_TO_PAYMENT };
      }

      this.formValues = await parseForm(
        $,
        state,
        this.checkoutToken,
        this._context.task.profile,
        'form.edit_checkout',
        'input, select, textarea, button',
      );

      $('noscript').each((_, el) => {
        if (!$(el).attr('src')) {
          const iframe = $(el).find('iframe');
          if (iframe) {
            const src = iframe.attr('src');
            if (src && /recaptcha/i.test(src)) {
              const match = src.match(/\?k=(.*)/);
              if (match && match.length) {
                [, this._context.task.site.sitekey] = match;
              }
            }
          }
        }
      });

      if ((/captcha/i.test(body) || this.needsCaptcha) && !this.captchaToken) {
        return { message: 'Waiting for captcha', nextState: States.CAPTCHA };
      }

      switch (state) {
        case States.GO_TO_CHECKOUT: {
          return { message: 'Submitting information', nextState: States.SUBMIT_CUSTOMER };
        }
        case States.GO_TO_SHIPPING: {
          return { message: 'Submitting shipping', nextState: States.SUBMIT_SHIPPING };
        }
        case States.GO_TO_PAYMENT: {
          if (!this.paymentToken && priceRecap !== '0') {
            return { message: 'Submitting payment', nextState: States.PAYMENT_TOKEN };
          }

          if (priceRecap === '0') {
            this.isFreeCheckout = true;
            this.needsPaymentToken = false;
          }

          return { message: 'Submitting payment', nextState: States.SUBMIT_PAYMENT };
        }
        default: {
          return { message: 'Submitting information', nextState: States.SUBMIT_SHIPPING };
        }
      }
    } catch (err) {
      this._logger.error(
        `CHECKOUT: %s Request Error..\n Step: ${step}.\n\n %j %j`,
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message,
        nextState: state,
      });

      const msg =
        err.status || err.errno ? `${message} - (${err.status || err.errno})` : `${message}`;

      return nextState || { message: msg, nextState: state };
    }
  }

  async submitCustomer() {
    const {
      task: {
        site: { url, name: siteName, apiKey },
        monitorDelay,
      },
      proxy,
    } = this._context;

    if (/dsm sg|dsm jp|dsm uk/i.test(siteName)) {
      return this.backupPatchCheckout();
    }

    if (this.captchaToken && !/g-recaptcha-response/i.test(this.formValues)) {
      const parts = this.formValues.split('button=');
      if (parts && parts.length) {
        this.formValues = '';
        await parts.map((part, i) => {
          if (i === 0) {
            this.formValues += `${part}g-recaptcha-response=${this.captchaToken}`;
          } else {
            this.formValues += part;
          }
        });
      }
    }

    this._logger.info('CONTACT FORM VALUES: %j', this.formValues);

    try {
      const res = await this._request(`${url}/${this.storeId}/checkouts/${this.checkoutToken}`, {
        method: 'POST',
        compress: true,
        agent: proxy,
        redirect: 'follow',
        follow: 1,
        headers: {
          ...getHeaders({ url, apiKey }),
          Connection: 'Keep-Alive',
          'content-type': 'application/x-www-form-urlencoded',
          'Upgrade-Insecure-Requests': '1',
          'sec-fetch-mode': 'navigate',
          'sec-fetch-site': 'same-origin',
          'sec-fetch-user': '?1',
          'X-Shopify-Storefront-Access-Token': `${apiKey}`,
          accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
        },
        body: this.formValues,
      });

      const { status, url: redirectUrl } = res;

      const checkStatus = stateForError(
        { status },
        {
          message: 'Submitting information',
          nextState: States.SUBMIT_CUSTOMER,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      const body = await res.text();
      const match = body.match(/Shopify\.Checkout\.step\s*=\s*"(.*)"/);

      if (/captcha validation failed/i.test(body)) {
        this.captchaToken = '';
        return { message: 'Captcha validation failed!', nextState: States.GO_TO_CHECKOUT };
      }

      if (match && match.length) {
        const [, step] = match;
        if (/stock_problems/i.test(step)) {
          return {
            message: `Out of stock, delaying ${monitorDelay}ms`,
            delay: true,
            nextState: States.GO_TO_CHECKOUT,
          };
        }

        if (/contact_information/i.test(step)) {
          return { message: 'Submitting information', nextState: States.GO_TO_CHECKOUT };
        }

        if (/shipping_method/i.test(step)) {
          return { message: 'Fetching shipping rates', nextState: States.GO_TO_SHIPPING };
        }

        if (/payment_method/i.test(step)) {
          return { message: 'Submitting payment', nextState: States.GO_TO_PAYMENT };
        }
      }

      // if we followed a redirect at some point...
      if (res.redirected) {
        if (/stock_problems/i.test(redirectUrl)) {
          return {
            message: `Out of stock, delaying ${monitorDelay}ms`,
            nextState: States.GO_TO_CHECKOUT,
          };
        }

        if (/password/i.test(redirectUrl)) {
          return { message: 'Password page', delay: true, nextState: States.SUBMIT_CUSTOMER };
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
              compress: true,
              agent: proxy,
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
      }

      return { message: 'Submitting information', nextState: States.GO_TO_CHECKOUT };
    } catch (err) {
      this._logger.error(
        'FRONTEND CHECKOUT: %s Request Error..\n Step: Submit customer .\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );
      const nextState = stateForError(err, {
        message: 'Submitting information',
        nextState: States.SUBMIT_CUSTOMER,
      });

      const message =
        err.status || err.errno
          ? `Submitting information - (${err.status || err.errno})`
          : 'Submitting information';

      return nextState || { message, nextState: States.SUBMIT_CUSTOMER };
    }
  }

  async backupPatchCheckout() {
    const {
      task: {
        site: { url, apiKey },
        profile: { shipping, billing, payment, billingMatchesShipping },
      },
      proxy,
    } = this._context;

    try {
      const res = await this._request(`/wallets/checkouts/${this.checkoutToken}.json`, {
        method: 'PATCH',
        compress: true,
        agent: proxy,
        redirect: 'follow',
        follow: 1,
        headers: {
          ...getHeaders({ url, apiKey }),
          'Content-Type': 'application/json',
          'Upgrade-Insecure-Requests': '1',
        },
        body: JSON.stringify(
          patchCheckoutForm(billingMatchesShipping, shipping, billing, payment, this.captchaToken),
        ),
      });

      this._logger.silly('API CHECKOUT: Patch checkout status: %s', res.status);

      const { status, url: redirectUrl } = res;

      const checkStatus = stateForError(
        { status },
        {
          message: 'Submitting information',
          nextState: States.SUBMIT_CUSTOMER,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      // if we followed a redirect at some point...
      if (res.redirected) {
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
              compress: true,
              agent: proxy,
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
      }

      const body = await res.json();

      if (
        body &&
        body.checkout &&
        !body.checkout.shipping_address &&
        !body.checkout.billing_address
      ) {
        const message = status ? `Submitting information – (${status})` : 'Submitting information';
        return { message, nextState: States.SUBMIT_CUSTOMER };
      }

      if (this._context.task.product.variants) {
        return { message: 'Adding to cart', nextState: States.ADD_TO_CART };
      }
      return { message: 'Waiting for product', nextState: States.WAIT_FOR_PRODUCT };
    } catch (err) {
      this._logger.error(
        'API CHECKOUT: %s Request Error..\n Step: Submitting Information.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Submitting information',
        nextState: States.SUBMIT_CUSTOMER,
      });

      const message =
        err.status || err.errno
          ? `Submitting information - (${err.status || err.errno})`
          : 'Submitting information';

      return nextState || { message, nextState: States.SUBMIT_CUSTOMER };
    }
  }

  async submitShipping() {
    const {
      task: {
        site: { url, apiKey },
        monitorDelay,
      },
      timers: { checkout },
      proxy,
    } = this._context;

    try {
      const res = await this._request(`/${this.storeId}/checkouts/${this.checkoutToken}`, {
        method: 'POST',
        compress: true,
        agent: proxy,
        redirect: 'follow',
        follow: 1,
        headers: {
          ...getHeaders({ url, apiKey }),
          Connection: 'Keep-Alive',
          'content-type': 'application/x-www-form-urlencoded',
          'Upgrade-Insecure-Requests': '1',
          'X-Shopify-Storefront-Access-Token': `${apiKey}`,
          'sec-fetch-mode': 'navigate',
          'sec-fetch-site': 'same-origin',
          'sec-fetch-user': '?1',
          accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
        },
        body: this.formValues,
      });

      const { status, url: redirectUrl } = res;

      const checkStatus = stateForError(
        { status },
        {
          message: 'Submitting shipping',
          nextState: States.SUBMIT_SHIPPING,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      const body = await res.text();
      const match = body.match(/Shopify\.Checkout\.step\s*=\s*"(.*)"/);

      if (/captcha/i.test(body)) {
        return { message: 'Waiting for captcha', nextState: States.CAPTCHA };
      }

      if (match && match.length) {
        const [, step] = match;

        if (/stock_problems/i.test(step)) {
          return {
            message: `Out of stock, delaying ${monitorDelay}ms`,
            delay: true,
            nextState: States.SUBMIT_SHIPPING,
          };
        }

        if (/captcha validation failed/i.test(body)) {
          this.captchaToken = '';
          return { message: 'Captcha failed!', nextState: States.GO_TO_CHECKOUT };
        }

        if (/processing/i.test(step)) {
          return { message: 'Processing payment', nextState: States.PROCESS_PAYMENT };
        }

        if (/contact_information/i.test(step)) {
          return { message: 'Submitting information', nextState: States.GO_TO_CHECKOUT };
        }

        if (/shipping_method/i.test(step)) {
          return { message: 'Fetching shipping rates', nextState: States.GO_TO_SHIPPING };
        }

        if (/payment_method/i.test(step)) {
          return { message: 'Submitting payment', nextState: States.GO_TO_PAYMENT };
        }
      }

      // if we followed a redirect at some point...
      if (res.redirected) {
        if (/processing/i.test(redirectUrl)) {
          this._context.task.checkoutSpeed = checkout.getRunTime();
          checkout.stop();
          checkout.reset();
          return { message: 'Processing payment', nextState: States.PROCESS_PAYMENT };
        }

        if (/stock_problems/i.test(redirectUrl)) {
          return {
            message: `Out of stock, delaying ${monitorDelay}ms`,
            delay: true,
            nextState: States.SUBMIT_SHIPPING,
          };
        }

        if (/password/i.test(redirectUrl)) {
          return { message: 'Password page', delay: true, nextState: States.SUBMIT_SHIPPING };
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
              compress: true,
              agent: proxy,
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
      }

      return { message: 'Submitting shipping', nextState: States.GO_TO_SHIPPING };
    } catch (err) {
      this._logger.error(
        'FRONTEND CHECKOUT: %s Request Error..\n Step: Submit shipping .\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );
      const nextState = stateForError(err, {
        message: 'Submitting shipping',
        nextState: States.SUBMIT_SHIPPING,
      });

      const message =
        err.status || err.errno
          ? `Submitting shipping - (${err.status || err.errno})`
          : 'Submitting shipping';

      return nextState || { message, nextState: States.SUBMIT_SHIPPING };
    }
  }

  async submitPayment() {
    const {
      task: {
        site: { url, name, apiKey },
        monitorDelay,
      },
      timers: { checkout },
      proxy,
    } = this._context;

    if (/dsm sg|dsm jp|dsm uk/i.test(name)) {
      return this.backupSubmitPayment();
    }

    if (this.isFreeCheckout) {
      const parts = this.formValues.split('&');

      if (parts && parts.length) {
        this.formValues = '';
        parts.map(part => {
          if (/authenticity_token/i.test(part)) {
            this.formValues += `_method=patch&${part}&previous_step=payment_method&step=&s=&checkout%5Bcredit_card%5D%5Bvault%5D=false&checkout%5Bpayment_gateway%5D=free&checkout%5Btotal_price%5D=0&complete=1&checkout%5Bclient_details%5D%5Bbrowser_width%5D=1721&checkout%5Bclient_details%5D%5Bbrowser_height%5D=927&checkout%5Bclient_details%5D%5Bjavascript_enabled%5D=1&checkout%5Bclient_details%5D%5Bcolor_depth%5D=24&checkout%5Bclient_details%5D%5Bjava_enabled%5D=false&checkout%5Bclient_details%5D%5Bbrowser_tz%5D=240`;
          }
        });
      }
    }

    if (this.needsPaymentToken) {
      const parts = this.formValues.split('s=');
      if (parts && parts.length) {
        this.formValues = '';
        await parts.map((part, i) => {
          if (i === 0) {
            this.formValues += `${part}s=${this.paymentToken}`;
          } else {
            this.formValues += part;
          }
        });
        this.needsPaymentToken = false;
      }
    }

    this._logger.info('PAYMENT FORM VALUES: %j', this.formValues);

    try {
      const res = await this._request(`/${this.storeId}/checkouts/${this.checkoutToken}`, {
        method: 'POST',
        compress: true,
        agent: proxy,
        redirect: 'manual',
        follow: 0,
        headers: {
          ...getHeaders({ url, apiKey }),
          Connection: 'Keep-Alive',
          'content-type': 'application/x-www-form-urlencoded',
          'accept-encoding': 'gzip, deflate, br',
          'accept-language': 'en-US,en;q=0.9',
          'Upgrade-Insecure-Requests': '1',
          'X-Shopify-Storefront-Access-Token': `${apiKey}`,
          'sec-fetch-mode': 'navigate',
          'sec-fetch-site': 'same-origin',
          'sec-fetch-user': '?1',
          accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
        },
        body: this.formValues,
      });

      const { status, headers } = res;
      const checkStatus = stateForError(
        { status },
        {
          message: 'Submitting payment',
          nextState: States.SUBMIT_PAYMENT,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      this.needsPaymentToken = true;
      this.paymentToken = '';

      const body = await res.text();

      const match = body.match(/Shopify\.Checkout\.step\s*=\s*"(.*)"/);

      if (/stock_problems/i.test(body)) {
        return {
          message: `Out of stock, delaying ${monitorDelay}ms`,
          delay: true,
          nextState: States.SUBMIT_PAYMENT,
        };
      }

      if (/Your payment can’t be processed/i.test(body)) {
        return {
          message: `Processing error, retrying in ${monitorDelay}ms`,
          delay: true,
          nextState: States.GO_TO_PAYMENT,
        };
      }

      if (/captcha/i.test(body)) {
        return { message: 'Waiting for captcha', nextState: States.CAPTCHA };
      }

      // if we followed a redirect at some point...
      const redirectUrl = headers.get('location');

      if (/processing/i.test(redirectUrl)) {
        this._context.task.checkoutSpeed = checkout.getRunTime();
        checkout.stop();
        checkout.reset();
        return { message: 'Processing payment', nextState: States.PROCESS_PAYMENT };
      }

      if (/stock_problems/i.test(redirectUrl)) {
        return {
          message: `Out of stock, delaying ${monitorDelay}ms`,
          delay: true,
          nextState: States.SUBMIT_PAYMENT,
        };
      }

      if (/password/i.test(redirectUrl)) {
        return { message: 'Password page', delay: true, nextState: States.GO_TO_PAYMENT };
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
            compress: true,
            agent: proxy,
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

      // step tests
      if (match && match.length) {
        const [, step] = match;

        if (/processing/i.test(step)) {
          this._context.task.checkoutSpeed = checkout.getRunTime();
          checkout.stop();
          checkout.reset();
          return { message: 'Processing payment', nextState: States.PROCESS_PAYMENT };
        }

        if (/contact_information/i.test(step)) {
          return { message: 'Submitting information', nextState: States.GO_TO_CHECKOUT };
        }

        if (/shipping_method/i.test(step)) {
          return { message: 'Fetching shipping rates', nextState: States.GO_TO_SHIPPING };
        }

        if (/payment_method/i.test(step)) {
          return { message: 'Submitting payment', nextState: States.GO_TO_PAYMENT };
        }

        if (/review/i.test(step)) {
          return { message: 'Completing payment', nextState: States.GO_TO_REVIEW };
        }
      }

      return { message: 'Submitting payment', nextState: States.GO_TO_PAYMENT };
    } catch (err) {
      this._logger.error(
        'FRONTEND CHECKOUT: %s Request Error..\n Step: Submit shipping information .\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );
      const nextState = stateForError(err, {
        message: 'Submitting payment',
        nextState: States.SUBMIT_PAYMENT,
      });

      const message =
        err.status || err.errno
          ? `Submitting payment - (${err.status || err.errno})`
          : 'Submitting payment';

      return nextState || { message, nextState: States.SUBMIT_PAYMENT };
    }
  }

  async backupSubmitPayment() {
    const {
      task: {
        site: { url, apiKey },
        monitorDelay,
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
      checkout: {
        shipping_rate: {
          id,
        },
      },
    };

    if (this.captchaToken) {
      formBody = {
        ...formBody,
        'g-recaptcha-response': this.captchaToken,
      };
    }

    try {
      const res = await this._request(checkoutUrl, {
        method: 'PATCH',
        compress: true,
        agent: proxy,
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
          message: 'Submitting payment',
          nextState: States.SUBMIT_PAYMENT,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      const redirectUrl = headers.get('location');
      this._logger.silly('CHECKOUT: Post payment redirect url: %s', redirectUrl);

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

      // check if redirected
      if (redirectUrl) {
        if (/processing/i.test(redirectUrl)) {
          this.captchaToken = '';
          this._context.task.checkoutSpeed = checkout.getRunTime();
          checkout.stop();
          checkout.reset();
          return { message: 'Processing payment', nextState: States.PROCESS_PAYMENT };
        }

        if (/checkpoint/i.test(redirectUrl)) {
          return { message: 'Going to checkpoint', nextState: States.GO_TO_CHECKPOINT };
        }

        if (/password/i.test(redirectUrl)) {
          return { message: 'Password page', delay: true, nextState: States.SUBMIT_PAYMENT };
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
              compress: true,
              agent: proxy,
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

        if (/stock_problems/i.test(redirectUrl)) {
          return {
            message: `Out of stock! Delaying ${monitorDelay}ms`,
            delay: true,
            nextState: States.COMPLETE_PAYMENT,
          };
        }
      }

      if ((this.needsCaptcha || /captcha/i.test(body)) && !this.captchaToken) {
        this._context.task.checkoutSpeed = checkout.getRunTime();
        checkout.stop();
        checkout.reset();
        return { message: 'Waiting for captcha', nextState: States.CAPTCHA };
      }

      const match = body.match(/Shopify.Checkout.step\s*=\s*"(.*)"/);
      if (match && /review/i.test(match)) {
        return { message: 'Completing payment', nextState: States.COMPLETE_PAYMENT };
      }

      if (match && /payment/i.test(match)) {
        return { message: 'Submitting payment', nextState: States.SUBMIT_PAYMENT };
      }

      if (match && /shipping/i.test(match)) {
        return { message: 'Fetching shipping rates', nextState: States.GO_TO_SHIPPING };
      }

      this._context.task.checkoutSpeed = checkout.getRunTime();
      checkout.stop();
      checkout.reset();
      return { message: 'Processing payment', nextState: States.PROCESS_PAYMENT };
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %s Request Error..\n Step: Post Payment.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Submitting payment',
        nextState: States.SUBMIT_PAYMENT,
      });

      const message =
        err.status || err.errno
          ? `Submitting payment - (${err.status || err.errno})`
          : 'Submitting payment';

      return nextState || { message, nextState: States.SUBMIT_PAYMENT };
    }
  }

  async completePayment() {
    const {
      task: {
        site: { url, name, apiKey },
        monitorDelay,
      },
      timers: { checkout },
      proxy,
    } = this._context;

    if (/dsm sg|dsm jp|dsm uk/i.test(name)) {
      return this.backupCompletePayment();
    }

    try {
      const res = await this._request(`/${this.storeId}/checkouts/${this.checkoutToken}`, {
        method: 'POST',
        compress: true,
        agent: proxy,
        redirect: 'follow',
        follow: 5,
        headers: {
          ...getHeaders({ url, apiKey }),
          Connection: 'Keep-Alive',
          'content-type': 'application/x-www-form-urlencoded',
          'Upgrade-Insecure-Requests': '1',
          'X-Shopify-Storefront-Access-Token': `${apiKey}`,
          'sec-fetch-mode': 'navigate',
          'sec-fetch-site': 'same-origin',
          'sec-fetch-user': '?1',
          accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
        },
        body: this.formValues,
      });

      const { status, url: redirectUrl } = res;

      const checkStatus = stateForError(
        { status },
        {
          message: 'Submitting payment',
          nextState: States.COMPLETE_PAYMENT,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      const body = await res.text();
      const match = body.match(/Shopify\.Checkout\.step\s*=\s*"(.*)"/);

      if (match && match.length > 0) {
        const [, step] = match;

        if (/processing/i.test(step)) {
          this._context.task.checkoutSpeed = checkout.getRunTime();
          checkout.stop();
          checkout.reset();
          return { message: 'Processing payment', nextState: States.PROCESS_PAYMENT };
        }

        if (/password/i.test(step)) {
          return { message: 'Password page', nextState: States.COMPLETE_PAYMENT };
        }

        if (/throttle/i.test(step)) {
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
              compress: true,
              agent: proxy,
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

        if (/contact_information/i.test(step)) {
          return { message: 'Submitting information', nextState: States.GO_TO_CHECKOUT };
        }

        if (/shipping_method/i.test(step)) {
          return { message: 'Fetching shipping rates', nextState: States.GO_TO_SHIPPING };
        }

        if (/payment_method/i.test(step)) {
          return { message: 'Submitting payment', nextState: States.GO_TO_PAYMENT };
        }

        if (/review/i.test(step)) {
          return { message: 'Submitting payment', nextState: States.GO_TO_REVIEW };
        }
      }

      if (redirectUrl) {
        if (/checkpoint/i.test(redirectUrl)) {
          return { message: 'Going to checkpoint', nextState: States.GO_TO_CHECKPOINT };
        }

        if (/stock_problems/.test(redirectUrl)) {
          return {
            message: `Out of stock, delaying ${monitorDelay}ms`,
            delay: true,
            nextState: States.COMPLETE_PAYMENT,
          };
        }

        if (/processing/.test(redirectUrl)) {
          return { message: 'Processing payment', nextState: States.PROCESS_PAYMENT };
        }

        if (/password/.test(redirectUrl)) {
          return { message: 'Password page', nextState: States.COMPLETE_PAYMENT };
        }

        if (/throttle/.test(redirectUrl)) {
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
              compress: true,
              agent: proxy,
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
      }

      if (/stock_problems/i.test(body)) {
        return {
          message: `Out of stock, delaying ${monitorDelay}ms`,
          delay: true,
          nextState: States.SUBMIT_PAYMENT,
        };
      }

      if (/captcha/i.test(body)) {
        return { message: 'Waiting for captcha', nextState: States.CAPTCHA };
      }

      return { message: 'Submitting payment', nextState: States.COMPLETE_PAYMENT };
    } catch (err) {
      this._logger.error(
        'FRONTEND CHECKOUT: %s Request Error..\n Step: Submitting payment .\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );
      const nextState = stateForError(err, {
        message: 'Submitting payment',
        nextState: States.COMPLTE_PAYMENT,
      });

      const message =
        err.status || err.errno
          ? `Submitting payment - (${err.status || err.errno})`
          : 'Submitting payment';

      return nextState || { message, nextState: States.COMPLTE_PAYMENT };
    }
  }

  async backupCompletePayment() {
    const {
      task: {
        site: { url, apiKey },
        monitorDelay,
      },
      timers: { checkout },
      proxy,
    } = this._context;

    let form = {
      complete: 1,
    };

    if (this.captchaToken) {
      form = {
        ...form,
        'g-recaptcha-response': this.captchaToken,
      };
    }

    try {
      const res = await this._request(`/${this.storeId}/checkouts/${this.checkoutToken}`, {
        method: 'PATCH',
        compress: true,
        agent: proxy,
        follow: 5,
        redirect: 'follow',
        headers: {
          ...getHeaders({ url, apiKey }),
          'Content-Type': 'application/json',
          'Upgrade-Insecure-Requests': '1',
          'X-Shopify-Storefront-Access-Token': `${apiKey}`,
        },
        body: JSON.stringify(form),
      });

      const { status, url: redirectUrl } = res;

      const checkStatus = stateForError(
        { status },
        {
          message: 'Completing payment',
          nextState: States.COMPLETE_PAYMENT,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      this._logger.silly('CHECKOUT: Complete payment redirect url: %s', redirectUrl);

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

      if (redirectUrl) {
        if (/processing/i.test(redirectUrl)) {
          this.captchaToken = '';
          checkout.stop();
          checkout.reset();
          return { message: 'Processing payment', nextState: States.PROCESS_PAYMENT };
        }

        if (/checkpoint/i.test(redirectUrl)) {
          return { message: 'Going to checkpoint', nextState: States.GO_TO_CHECKPOINT };
        }

        if (/stock_problems/i.test(redirectUrl)) {
          return {
            message: `Out of stock! Delaying ${monitorDelay}ms`,
            delay: true,
            nextState: States.COMPLETE_PAYMENT,
          };
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
              compress: true,
              agent: proxy,
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

        if (/password/i.test(redirectUrl)) {
          return { message: 'Password page', delay: true, nextState: States.COMPLETE_PAYMENT };
        }
      }

      if ((this.needsCaptcha || /captcha/i.test(body)) && !this.captchaToken) {
        this._context.task.checkoutSpeed = checkout.getRunTime();
        checkout.stop();
        checkout.reset();
        return { message: 'Waiting for captcha', nextState: States.CAPTCHA };
      }

      const match = body.match(/Shopify.Checkout.step\s*=\s*"(.*)"/);
      if (match && /payment/i.test(match)) {
        return { message: 'Submitting payment', nextState: States.SUBMIT_PAYMENT };
      }

      if (match && /shipping/i.test(match)) {
        return { message: 'Fetching shipping rates', nextState: States.GO_TO_SHIPPING };
      }

      return { message: 'Submitting payment', nextState: States.COMPLETE_PAYMENT };
    } catch (err) {
      this._logger.error(
        'CHECKOUT: %s Request Error..\n Step: Complete Payment.\n\n %j %j',
        err.status || err.errno,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Processing payment',
        nextState: States.COMPLETE_PAYMENT,
      });

      const message =
        err.status || err.errno
          ? `Processing payment - (${err.status || err.errno})`
          : 'Processing payment';

      return nextState || { message, nextState: States.COMPLETE_PAYMENT };
    }
  }
}

module.exports = SafeCheckout;
