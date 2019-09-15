/* eslint-disable no-nested-ternary */
/* eslint-disable array-callback-return */
/* eslint-disable consistent-return */
/* eslint-disable no-return-assign */
/* eslint-disable class-methods-use-this */
import HttpsProxyAgent from 'https-proxy-agent';
import cheerio from 'cheerio';
import { min } from 'lodash';
import { parse } from 'query-string';
import Checkout from '../checkout';

const { States, Modes } = require('../utils/constants').TaskRunner;
const { ParseType } = require('../utils/constants').Monitor;
const { userAgent } = require('../../../common');
const { stateForError, getHeaders } = require('../utils');
const { addToCart, patchCheckoutForm } = require('../utils/forms');
const pickVariant = require('../utils/pickVariant');

class SafeCheckout extends Checkout {
  constructor(context, type = Modes.SAFE) {
    super(context, type);
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
      const res = await this._request(`${url}/cart/add.js`, {
        method: 'POST',
        agent: proxy ? new HttpsProxyAgent(proxy) : null,
        compress: true,
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
          let ctdUrl;
          if (/_ctd/.test(redirectUrl)) {
            ctdUrl = redirectUrl;
          } else {
            const ctd = this.getCookie(this._jar, '_ctd');
            ctdUrl = `${url}/throttle/queue?_ctd=${ctd}&_ctd_update=`;
          }

          try {
            await this._request(ctdUrl, {
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
        err.status,
        err.message,
        err.stack,
      );
      const nextState = stateForError(err, {
        message: 'Adding to cart',
        nextState: States.ADD_TO_CART,
      });

      const message = err.status ? `Adding to cart - (${err.status})` : 'Adding to cart';

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
              : /dsm us/i.test(name)
              ? {
                  _HASH: hash,
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
        agent: proxy ? new HttpsProxyAgent(proxy) : null,
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
        if (/password/i.test(redirectUrl)) {
          return { message: 'Password page', delay: true, nextState: States.ADD_TO_CART };
        }

        if (/throttle/i.test(redirectUrl)) {
          let ctdUrl;
          if (/_ctd/.test(redirectUrl)) {
            ctdUrl = redirectUrl;
          } else {
            const ctd = this.getCookie(this._jar, '_ctd');
            ctdUrl = `${url}/throttle/queue?_ctd=${ctd}&_ctd_update=`;
          }

          try {
            await this._request(ctdUrl, {
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
          return { message: 'Submitting payment', nextState: States.SUBMIT_PAYMENT };
        }
        return { message: 'Going to checkout', nextState: States.GO_TO_CHECKOUT };
      }
      const message = status ? `Adding to cart – (${status})` : 'Adding to cart';
      return { message, nextState: States.ADD_TO_CART };
    } catch (err) {
      this._logger.error(
        'API CHECKOUT: %s Request Error..\n Step: Add to Cart.\n\n %j %j',
        err.type,
        err.message,
        err.stack,
      );
      const nextState = stateForError(err, {
        message: 'Adding to cart',
        nextState: States.ADD_TO_CART,
      });

      const message = err.status ? `Adding to cart – (${err.status})` : 'Adding to cart';
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
          let ctdUrl;
          if (/_ctd/.test(redirectUrl)) {
            ctdUrl = redirectUrl;
          } else {
            const ctd = this.getCookie(this._jar, '_ctd');
            ctdUrl = `${url}/throttle/queue?_ctd=${ctd}&_ctd_update=`;
          }

          try {
            await this._request(ctdUrl, {
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
        err.statusCode,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Going to checkout',
        nextState: States.GO_TO_CHECKOUT,
      });

      const message = err.statusCode
        ? `Going to checkout - (${err.statusCode})`
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
          agent: proxy ? new HttpsProxyAgent(proxy) : null,
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
        err.status,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Fetching shipping rates',
        nextState: States.ShippingRates,
      });

      const message = err.status
        ? `Fetching shipping rates – (${err.status})`
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
        agent: proxy ? new HttpsProxyAgent(proxy) : null,
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

      const { status } = res;

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

      const body = await res.text();

      const $ = cheerio.load(body, {
        normalizeWhitespace: true,
        xmlMode: true,
      });

      this.note = $('input[name="note"]').attr('value');

      $('form[action="/cart"] input, select, textarea').each((_, el) => {
        const name = $(el).attr('name');
        const value = $(el).attr('value') || '';
        // BLACKLIST values/names
        if (!/update cart|{{itemQty}}/i.test(value)) {
          this.cartForm += `${name}=${value ? value.replace(/\s/g, '+') : ''}&`;
        }
      });

      this.cartForm = this.cartForm.slice(0, -1);

      return { message: 'Creating checkout', nextState: States.CREATE_CHECKOUT };
    } catch (err) {
      this._logger.error(
        'FRONTEND CHECKOUT: %s Request Error..\n Step: Submit customer .\n\n %j %j',
        err.status,
        err.message,
        err.stack,
      );
      const nextState = stateForError(err, {
        message: 'Going to cart',
        nextState: States.GO_TO_CART,
      });

      const message = err.status ? `Going to cart - (${err.status})` : 'Going to cart';

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

    try {
      const res = await this._request(`${url}/cart`, {
        method: 'POST',
        agent: proxy ? new HttpsProxyAgent(proxy) : null,
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
        if (/password/i.test(redirectUrl)) {
          return { message: 'Password page', delay: true, nextState: States.CREATE_CHECKOUT };
        }

        if (/throttle/i.test(redirectUrl)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this._logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._request(decodeURIComponent(redirectUrl), {
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
          return { message: 'Going to checkout', nextState: States.GO_TO_CHECKOUT };
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
        agent: proxy ? new HttpsProxyAgent(proxy) : null,
        redirect: 'follow',
        follow: 5,
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

      const { status, url: redirectUrl } = res;

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

      this._logger.debug('Create checkout redirect url: %j', redirectUrl);

      if (redirectUrl) {
        if (/password/i.test(redirectUrl)) {
          return { message: 'Password page', delay: true, nextState: States.CREATE_CHECKOUT };
        }

        if (/throttle/i.test(redirectUrl)) {
          const queryStrings = new URL(redirectUrl).search;
          const parsed = parse(queryStrings);

          if (parsed && parsed._ctd) {
            this._logger.info('FIRST _CTD: %j', parsed._ctd);
            this._ctd = parsed._ctd;
          }

          try {
            await this._request(decodeURIComponent(redirectUrl), {
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

  async getCheckout(state, message, step, prevStep) {
    const {
      task: {
        site: { url, apiKey },
        monitorDelay,
        forceCaptcha,
      },
      timers: { checkout, monitor },
      proxy,
    } = this._context;

    const stepUrl = prevStep
      ? `/${this.storeId}/checkouts/${this.checkoutToken}?step=${step}?previous_step=${prevStep}`
      : `/${this.storeId}/checkouts/${this.checkoutToken}?step=${step}`;

    monitor.stop();
    monitor.reset();
    try {
      const res = await this._request(stepUrl, {
        method: 'GET',
        agent: proxy ? new HttpsProxyAgent(proxy) : null,
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
          message,
          nextState: state,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      const body = await res.text();
      const $ = cheerio.load(body);

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
        if (/password/i.test(redirectUrl)) {
          return { message: 'Password page', delay: true, nextState: state };
        }

        if (/throttle/i.test(redirectUrl)) {
          let ctdUrl;
          if (/_ctd/.test(redirectUrl)) {
            ctdUrl = redirectUrl;
          } else {
            const ctd = this.getCookie(this._jar, '_ctd');
            ctdUrl = `${url}/throttle/queue?_ctd=${ctd}&_ctd_update=`;
          }

          try {
            await this._request(ctdUrl, {
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

        if (/stock_problems/i.test(redirectUrl)) {
          return {
            message: `Out of stock! Delaying ${monitorDelay}ms`,
            delay: true,
            nextState: state,
          };
        }

        if (/cart/i.test(redirectUrl)) {
          return { message: `Cart empty!`, nextState: States.ADD_TO_CART };
        }
      }

      this.protection = await this.parseBotProtection($);
      this.authToken = $('form.edit_checkout input[name=authenticity_token]').attr('value');

      if (/Getting available shipping rates/i.test(body)) {
        return { message: 'Polling shipping rates', nextState: States.GO_TO_SHIPPING };
      }

      if ((/captcha/i.test(body) || forceCaptcha) && !this.captchaToken) {
        this._emitTaskEvent({ message: 'Captcha found!' });
        this.needsCaptcha = true;
        return { message: 'Waiting for captcha', nextState: States.CAPTCHA };
      }

      if (/calculating taxes/i.test(body) || /polling/i.test(body)) {
        return { message: 'Submitting payment', nextState: States.GO_TO_PAYMENT };
      }

      if (step === 'payment_method' && !this.paymentGateway) {
        this.paymentGateway = $('input[name="checkout[payment_gateway]"]').attr('value');
        this.prices.total = $('input[name="checkout[total_price]"]').attr('value');
      }

      if (step === 'shipping_method' && !this.chosenShippingMethod.id) {
        this.chosenShippingMethod.id = $('.radio-wrapper').attr('data-shipping-method');
      }

      switch (state) {
        case States.GO_TO_CHECKOUT: {
          checkout.reset();
          checkout.start();
          return { message: 'Submitting information', nextState: States.SUBMIT_CUSTOMER };
        }
        case States.GO_TO_SHIPPING: {
          return { message: 'Submitting shipping', nextState: States.SUBMIT_SHIPPING };
        }
        case States.GO_TO_PAYMENT: {
          return { message: 'Submitting payment', nextState: States.SUBMIT_PAYMENT };
        }
        default: {
          return { message: 'Submitting information', nextState: States.SUBMIT_SHIPPING };
        }
      }
    } catch (err) {
      this._logger.error(
        `CHECKOUT: %s Request Error..\n Step: ${step}.\n\n %j %j`,
        err.statusCode,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message,
        nextState: state,
      });

      const msg = err.statusCode ? `${message} - (${err.statusCode})` : `${message}`;

      return nextState || { message: msg, nextState: state };
    }
  }

  async submitCustomer() {
    const {
      task: {
        site: { url, name, apiKey },
        profile: { shipping, payment },
        monitorDelay,
      },
      proxy,
    } = this._context;

    if (/dsm sg|dsm jp|dsm uk/i.test(name)) {
      return this.backupPatchCheckout();
    }

    let params = `_method=patch&authenticty_token=${
      this.authToken
    }&previous_step=contact_information&step=shipping_method&checkout%5Bemail%5D=${
      payment.email
    }&checkout%5Bbuyer_accepts_marketing%5D=0&checkout%5Bshipping_address%5D%5Bfirst_name%5D=${
      shipping.firstName
    }&checkout%5Bshipping_address%5D%5Blast_name%5D=${
      shipping.lastName
    }&checkout%5Bshipping_address%5D%5Baddress1%5D=${
      shipping.address
    }&checkout%5Bshipping_address%5D%5Baddress2%5D=${
      shipping.apt
    }&checkout%5Bshipping_address%5D%5Bcity%5D=${
      shipping.city
    }&checkout%5Bshipping_address%5D%5Bcountry%5D=${
      shipping.country.label
    }&checkout%5Bshipping_address%5D%5Bprovince%5D=${
      shipping.provice ? shipping.province.value : ''
    }&checkout%5Bshipping_address%5D%5Bzip%5D=${
      shipping.zipCode
    }&checkout%5Bshipping_address%5D%5Bphone%5D=${
      shipping.phone
    }&checkout%5Bshipping_address%5D%5Bfirst_name%5D=${
      shipping.firstName
    }&checkout%5Bshipping_address%5D%5Blast_name%5D=${
      shipping.lastName
    }&checkout%5Bshipping_address%5D%5Baddress1%5D=${
      shipping.address
    }&checkout%5Bshipping_address%5D%5Baddress2%5D=${
      shipping.apt
    }&checkout%5Bshipping_address%5D%5Bcity%5D=${
      shipping.city
    }&checkout%5Bshipping_address%5D%5Bcountry%5D=${
      shipping.country.label
    }&checkout%5Bshipping_address%5D%5Bprovince%5D=${
      shipping.province ? shipping.province.value : ''
    }&checkout%5Bshipping_address%5D%5Bzip%5D=${
      shipping.zipCode
    }&checkout%5Bshipping_address%5D%5Bphone%5D=${
      shipping.phone
    }&checkout%5Bremember_me%5D=false&checkout%5Bremember_me%5D=0&button=&checkout%5Bclient_details%5D%5Bbrowser_width%5D=1358&checkout%5Bclient_details%5D%5Bbrowser_height%5D=655&checkout%5Bclient_details%5D%5Bjavascript_enabled%5D=1`;

    if (this.protection.length) {
      this.protection.map(hash => (params += `&${hash}=`));
      params += `&${this.checkoutToken}-count=${this.protection.length}`;
      params += `&${this.checkoutToken}-count=fs_count`;
    }

    if (this.captchaToken) {
      params += `&g-recaptcha-response=${this.captchaToken}`;
    }

    params = params.replace(/\s/g, '+');

    try {
      const res = await this._request(`${url}/${this.storeId}/checkouts/${this.checkoutToken}`, {
        method: 'POST',
        agent: proxy ? new HttpsProxyAgent(proxy) : null,
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
        body: params,
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
        this.captchaToken = ''; // rest captcha token...
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
          let ctdUrl;
          if (/_ctd/.test(redirectUrl)) {
            ctdUrl = redirectUrl;
          } else {
            const ctd = this.getCookie(this._jar, '_ctd');
            ctdUrl = `${url}/throttle/queue?_ctd=${ctd}&_ctd_update=`;
          }

          try {
            await this._request(ctdUrl, {
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
      }

      return { message: 'Submitting information', nextState: States.GO_TO_CHECKOUT };
    } catch (err) {
      this._logger.error(
        'FRONTEND CHECKOUT: %s Request Error..\n Step: Submit customer .\n\n %j %j',
        err.status,
        err.message,
        err.stack,
      );
      const nextState = stateForError(err, {
        message: 'Submitting information',
        nextState: States.SUBMIT_CUSTOMER,
      });

      const message = err.status
        ? `Submitting information - (${err.status})`
        : 'Submitting information';

      return nextState || { message, nextState: States.SUBMIT_CUSTOMER };
    }
  }

  async backupPatchCheckout() {
    const {
      task: {
        site: { url, apiKey },
        profile: { shipping, billing, payment, billingMatchesShipping },
        product: { variants },
      },
      proxy,
    } = this._context;

    try {
      const res = await this._request(`/wallets/checkouts/${this.checkoutToken}.json`, {
        method: 'PATCH',
        agent: proxy ? new HttpsProxyAgent(proxy) : null,
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
          let ctdUrl;
          if (/_ctd/.test(redirectUrl)) {
            ctdUrl = redirectUrl;
          } else {
            const ctd = this.getCookie(this._jar, '_ctd');
            ctdUrl = `${url}/throttle/queue?_ctd=${ctd}&_ctd_update=`;
          }

          try {
            await this._request(ctdUrl, {
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

      if (variants && variants.length) {
        return { message: 'Adding to cart', nextState: States.ADD_TO_CART };
      }
      return { message: 'Waiting for product', nextState: States.WAIT_FOR_PRODUCT };
    } catch (err) {
      this._logger.error(
        'API CHECKOUT: %s Request Error..\n Step: Submitting Information.\n\n %j %j',
        err.status,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Submitting information',
        nextState: States.SUBMIT_CUSTOMER,
      });

      const message = err.status
        ? `Submitting information – (${err.status})`
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

    const { id } = this.chosenShippingMethod;

    let params = `_method=patch&authenticity_token=${
      this.authToken
    }&previous_step=shipping_method&step=payment_method&checkout%5Bshipping_rate%5D%5Bid%5D=${encodeURIComponent(
      id,
    )}&checkout%5Bclient_details%5D%5Bbrowser_width%5D=916&checkout%5Bclient_details%5D%5Bbrowser_height%5D=967&checkout%5Bclient_details%5D%5Bjavascript_enabled%5D=1&checkout%5Bclient_details%5D%5Bcolor_depth%5D=24&checkout%5Bclient_details%5D%5Bjava_enabled%5D=false&checkout%5Bclient_details%5D%5Bbrowser_tz%5D=240`;

    if (this.protection.length) {
      params += '&field_start=hidden';
      this.protection.map(hash => (params += `&${hash}=`));
      params += '&field_end=hidden';
      params += `&${this.checkoutToken}-count=${this.protection.length}`;
    }

    params = params.replace(/\s/g, '+');
    try {
      const res = await this._request(`/${this.storeId}/checkouts/${this.checkoutToken}`, {
        method: 'POST',
        agent: proxy ? new HttpsProxyAgent(proxy) : null,
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
        body: params,
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
          let ctdUrl;
          if (/_ctd/.test(redirectUrl)) {
            ctdUrl = redirectUrl;
          } else {
            const ctd = this.getCookie(this._jar, '_ctd');
            ctdUrl = `${url}/throttle/queue?_ctd=${ctd}&_ctd_update=`;
          }

          try {
            await this._request(ctdUrl, {
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
      }

      return { message: 'Submitting shipping', nextState: States.GO_TO_SHIPPING };
    } catch (err) {
      this._logger.error(
        'FRONTEND CHECKOUT: %s Request Error..\n Step: Submit shipping .\n\n %j %j',
        err.status,
        err.message,
        err.stack,
      );
      const nextState = stateForError(err, {
        message: 'Submitting shipping',
        nextState: States.SUBMIT_SHIPPING,
      });

      const message = err.status ? `Submitting shipping - (${err.status})` : 'Submitting shipping';

      return nextState || { message, nextState: States.SUBMIT_SHIPPING };
    }
  }

  async submitPayment() {
    const {
      task: {
        site: { url, name, apiKey },
        profile: { billing, billingMatchesShipping },
        monitorDelay,
      },
      timers: { checkout },
      proxy,
    } = this._context;

    if (/dsm sg|dsm jp|dsm uk/i.test(name)) {
      return this.backupSubmitPayment();
    }

    let params = `_method=patch&authenticity_token=${encodeURIComponent(
      this.authToken,
    )}&previous_step=payment_method&step=&s=${
      this.paymentToken
    }&checkout%5Bcredit_card%5D%5Bvault%5D=false&checkout%5Bpayment_gateway%5D=${
      this.paymentGateway
    }&checkout%5Bdifferent_billing_address%5D=${!billingMatchesShipping}`;

    if (!billingMatchesShipping) {
      params += `&checkout%5Bbilling_address%5D%5Bfirst_name%5D=${
        billing.firstName
      }&checkout%5Bbilling_address%5D%5Blast_name%5D=${
        billing.lastName
      }&checkout%5Bbilling_address%5D%5Baddress1%5D=${
        billing.address
      }&checkout%5Bbilling_address%5D%5Baddress2%5D=${
        billing.apt
      }&checkout%5Bbilling_address%5D%5Bcity%5D=${
        billing.city
      }&checkout%5Bbilling_address%5D%5Bcountry%5D=${
        billing.country.value
      }&checkout%5Bbilling_address%5D%5Bprovince%5D=${
        billing.province ? billing.province.label : ''
      }&checkout%5Bbilling_address%5D%5Bzip%5D=${
        billing.zipCode
      }&checkout%5Bbilling_address%5D%5Bfirst_name%5D=${
        billing.firstName
      }&checkout%5Bbilling_address%5D%5Blast_name%5D=${
        billing.lastName
      }&checkout%5Bbilling_address%5D%5Baddress1%5D=${
        billing.address
      }&checkout%5Bbilling_address%5D%5Baddress2%5D=${
        billing.apt
      }&checkout%5Bbilling_address%5D%5Bcity%5D=${
        billing.city
      }&checkout%5Bbilling_address%5D%5Bcountry%5D=${
        billing.country.label
      }&checkout%5Bbilling_address%5D%5Bprovince%5D=${
        billing.province ? billing.province.value : ''
      }&checkout%5Bbilling_address%5D%5Bzip%5D=${billing.zipCode}`;
    }

    params += `&checkout%5Bremember_me%5D=false&checkout%5Bremember_me%5D=0&checkout%5Bvault_phone%5D=&complete=1&checkout%5Bclient_details%5D%5Bbrowser_width%5D=899&checkout%5Bclient_details%5D%5Bbrowser_height%5D=967&checkout%5Bclient_details%5D%5Bjavascript_enabled%5D=1&checkout%5Bclient_details%5D%5Bcolor_depth%5D=24&checkout%5Bclient_details%5D%5Bjava_enabled%5D=false&checkout%5Bclient_details%5D%5Bbrowser_tz%5D=240`;

    if (this.prices.total) {
      params += `&checkout%5Btotal_price%5D=${this.prices.total}`;
    }

    if (this.protection.length) {
      this.protection.map(hash => (params += `&${hash}=`));
      params += `&${this.checkoutToken}-count=${this.protection.length}`;
      params += `&${this.checkoutToken}-count=fs_count`;
    }

    params = params.replace(/\s/g, '+');

    try {
      const res = await this._request(`/${this.storeId}/checkouts/${this.checkoutToken}`, {
        method: 'POST',
        agent: proxy ? new HttpsProxyAgent(proxy) : null,
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
        body: params,
      });

      const { status, url: redirectUrl } = res;

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
            nextState: States.SUBMIT_PAYMENT,
          };
        }

        if (/password/i.test(redirectUrl)) {
          return { message: 'Password page', delay: true, nextState: States.GO_TO_PAYMENT };
        }

        if (/throttle/i.test(redirectUrl)) {
          let ctdUrl;
          if (/_ctd/.test(redirectUrl)) {
            ctdUrl = redirectUrl;
          } else {
            const ctd = this.getCookie(this._jar, '_ctd');
            ctdUrl = `${url}/throttle/queue?_ctd=${ctd}&_ctd_update=`;
          }

          try {
            await this._request(ctdUrl, {
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
      }

      return { message: 'Submitting payment', nextState: States.GO_TO_PAYMENT };
    } catch (err) {
      this._logger.error(
        'FRONTEND CHECKOUT: %s Request Error..\n Step: Submit shipping information .\n\n %j %j',
        err.status,
        err.message,
        err.stack,
      );
      const nextState = stateForError(err, {
        message: 'Submitting payment',
        nextState: States.SUBMIT_PAYMENT,
      });

      const message = err.status ? `Submitting payment - (${err.status})` : 'Submitting payment';

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

        if (/password/i.test(redirectUrl)) {
          return { message: 'Password page', delay: true, nextState: States.SUBMIT_PAYMENT };
        }

        if (/throttle/i.test(redirectUrl)) {
          let ctdUrl;
          if (/_ctd/.test(redirectUrl)) {
            ctdUrl = redirectUrl;
          } else {
            const ctd = this.getCookie(this._jar, '_ctd');
            ctdUrl = `${url}/throttle/queue?_ctd=${ctd}&_ctd_update=`;
          }

          try {
            await this._request(ctdUrl, {
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
        err.statusCode,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Submitting payment',
        nextState: States.SUBMIT_PAYMENT,
      });

      const message = err.statusCode
        ? `Submitting payment - (${err.statusCode})`
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

    let params = `_method=patch&authenticity_token=${this.authToken}&complete=1&button=`;

    if (this.prices.total) {
      params += `&checkout%5Btotal_price%5D=${this.prices.total}`;
    }

    params +=
      '&checkout%5Bclient_details%5D%5Bbrowser_width%5D=927&checkout%5Bclient_details%5D%5Bbrowser_height%5D=967&checkout%5Bclient_details%5D%5Bjavascript_enabled%5D=1';

    if (this.protection.length) {
      this.protection.map(hash => (params += `&${hash}=`));
      params += `&${this.checkoutToken}-count=${this.protection.length}`;
      params += `&${this.checkoutToken}-count=fs_count`;
    }

    params = params.replace(/\s/g, '+');

    try {
      const res = await this._request(`/${this.storeId}/checkouts/${this.checkoutToken}`, {
        method: 'POST',
        agent: proxy ? new HttpsProxyAgent(proxy) : null,
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
        body: params,
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
        err.status,
        err.message,
        err.stack,
      );
      const nextState = stateForError(err, {
        message: 'Submitting payment',
        nextState: States.COMPLTE_PAYMENT,
      });

      const message = err.status ? `Submitting payment - (${err.status})` : 'Submitting payment';

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
        agent: proxy ? new HttpsProxyAgent(proxy) : null,
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

        if (/stock_problems/i.test(redirectUrl)) {
          return {
            message: `Out of stock! Delaying ${monitorDelay}ms`,
            delay: true,
            nextState: States.COMPLETE_PAYMENT,
          };
        }

        if (/throttle/i.test(redirectUrl)) {
          let ctdUrl;
          if (/_ctd/.test(redirectUrl)) {
            ctdUrl = redirectUrl;
          } else {
            const ctd = this.getCookie(this._jar, '_ctd');
            ctdUrl = `${url}/throttle/queue?_ctd=${ctd}&_ctd_update=`;
          }

          try {
            await this._request(ctdUrl, {
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
        err.statusCode,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Processing payment',
        nextState: States.COMPLETE_PAYMENT,
      });

      const message = err.statusCode
        ? `Processing payment - (${err.statusCode})`
        : 'Processing payment';

      return nextState || { message, nextState: States.COMPLETE_PAYMENT };
    }
  }
}

module.exports = SafeCheckout;
