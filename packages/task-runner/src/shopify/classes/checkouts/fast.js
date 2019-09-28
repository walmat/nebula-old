/* eslint-disable no-nested-ternary */
import HttpsProxyAgent from 'https-proxy-agent';
import { min } from 'lodash';
import { parse } from 'query-string';
import Checkout from '../checkout';

const { States, Modes } = require('../utils/constants').TaskRunner;
const { ParseType } = require('../utils/constants').Monitor;
const { userAgent } = require('../../../common');
const { getHeaders, stateForError } = require('../utils');
const { patchCheckoutForm } = require('../utils/forms');
const pickVariant = require('../utils/pickVariant');

class FastCheckout extends Checkout {
  constructor(context, type = Modes.FAST) {
    super(context, type);
  }
  /**
   * *THIS IS JUST THE CHECKOUT PROCESS*
   * 1.* Login **DONE** `States.LOGIN`
   * 1. Create checkout **DONE** `States.CREATE_CHECKOUT`
   * 2. Send shipping info **DONE** `States.SUBMIT_SHIPPING`
   * **Once product is found**
   * 3. Add to cart **DONE** `States.ADD_TO_CART`
   * Concurrently 4a and 4b:
   * 4a. Go to checkout `States.GO_TO_CHECKOUT`
   * 4b. Get shipping rates `States.GO_TO_SHIPPING`
   * **if 4a shows we need captcha**
   * 4c.* Request captcha  **DONE** `States.CAPTCHA`
   * 5. (WAIT ON ALL STEP 4s!) Submit payment `States.SUBMIT_PAYMENT`
   * 5*. Complete payment (not always needed) `States.COMPLETE_PAYMENT`
   * 6. Process payment `States.PROCESS_PAYMENT`
   */

  async addToCart() {
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
            quantity: 1,
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

  async submitCustomer() {
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
        agent: proxy ? new HttpsProxyAgent(proxy) : null,
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
      this.captchaToken = '';

      const { status } = res;

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

      this.needsPatched = false;
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

  async getCheckout() {
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
          nextState: States.PAYMENT_TOKEN,
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
        forceCaptcha,
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

      // extra check for country not supported
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
            if (this.needsCaptcha || forceCaptcha) {
              return { message: 'Waiting for captcha', nextState: States.CAPTCHA };
            }
            return { message: 'Submitting payment', nextState: States.PAYMENT_TOKEN };
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
        if (this.needsCaptcha || forceCaptcha) {
          return { message: 'Waiting for captcha', nextState: States.CAPTCHA };
        }
        return { message: 'Submitting payment', nextState: States.PAYMENT_TOKEN };
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

  async submitPayment() {
    const {
      task: {
        site: { url, apiKey },
        monitorDelay,
        forceCaptcha,
      },
      timers: { checkout },
      proxy,
    } = this._context;

    const { id } = this.chosenShippingMethod;

    let formBody = {
      complete: '1',
      s: this.paymentToken,
    };

    if (id) {
      formBody = {
        ...formBody,
        checkout: {
          ...formBody.checkout,
          shipping_rate: {
            id,
          },
        },
      };
    }

    if (this.captchaToken) {
      formBody = {
        ...formBody,
        'g-recaptcha-response': this.captchaToken,
      };
    }

    try {
      const res = await this._request(`/${this.storeId}/checkouts/${this.checkoutToken}`, {
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
          this.isRestocking = true;
          this._context.task.checkoutSpeed = checkout.getRunTime();
          checkout.stop();
          checkout.reset();
          return { message: 'Processing payment', nextState: States.PROCESS_PAYMENT };
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

      const match = body.match(/Shopify.Checkout.step\s*=\s*"(.*)"/);
      if (match && /review/i.test(match)) {
        return { message: 'Completing payment', nextState: States.COMPLETE_PAYMENT };
      }

      if (match && /contact_information/i.test(match)) {
        return { message: 'Submitting information', nextState: States.SUBMIT_CUSTOMER };
      }

      if (match && /payment/i.test(match)) {
        return { message: 'Submitting payment', nextState: States.SUBMIT_PAYMENT };
      }

      if (match && /shipping/i.test(match)) {
        return { message: 'Fetching shipping rates', nextState: States.GO_TO_SHIPPING };
      }

      if ((forceCaptcha || /captcha/i.test(body)) && !this.captchaToken) {
        this._context.task.checkoutSpeed = checkout.getRunTime();
        checkout.stop();
        checkout.reset();
        return { message: 'Waiting for captcha', nextState: States.CAPTCHA };
      }

      this._context.task.checkoutSpeed = checkout.getRunTime();
      checkout.stop();
      checkout.reset();
      return { message: 'Submitting payment', nextState: States.SUBMIT_PAYMENT };
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
        site: { url, apiKey },
        monitorDelay,
        forceCaptcha,
      },
      timers: { checkout },
      proxy,
    } = this._context;

    let form = {
      complete: 1,
    };

    if (this.isRestocking) {
      form = {
        ...form,
        'g-recaptcha-response': this.captchaToken,
      };
    }

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
        body: JSON.stringify(form),
      });

      const { status, headers } = res;

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

      const redirectUrl = headers.get('location');
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
          this.isRestocking = true;
          this._context.task.checkoutSpeed = checkout.getRunTime();
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

      const match = body.match(/Shopify.Checkout.step\s*=\s*"(.*)"/);
      if (match && /review/i.test(match)) {
        return { message: 'Completing payment', nextState: States.COMPLETE_PAYMENT };
      }

      if (match && /contact_information/i.test(match)) {
        return { message: 'Submitting information', nextState: States.SUBMIT_CUSTOMER };
      }

      if (match && /payment/i.test(match)) {
        return { message: 'Submitting payment', nextState: States.SUBMIT_PAYMENT };
      }

      if (match && /shipping/i.test(match)) {
        return { message: 'Fetching shipping rates', nextState: States.GO_TO_SHIPPING };
      }

      if ((forceCaptcha || /captcha/i.test(body)) && !this.captchaToken) {
        this._context.task.checkoutSpeed = checkout.getRunTime();
        checkout.stop();
        checkout.reset();
        return { message: 'Waiting for captcha', nextState: States.CAPTCHA };
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
        message: 'Completing payment',
        nextState: States.COMPLETE_PAYMENT,
      });

      const message =
        err.status || err.errno
          ? `Completing payment - (${err.status || err.errno})`
          : 'Completing payment';

      return nextState || { message, nextState: States.COMPLETE_PAYMENT };
    }
  }
}

module.exports = FastCheckout;
