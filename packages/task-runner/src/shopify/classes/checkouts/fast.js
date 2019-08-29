/* eslint-disable no-return-assign */
/* eslint-disable class-methods-use-this */
import HttpsProxyAgent from 'https-proxy-agent';
import { min } from 'lodash';
import Checkout from '../checkout';

const { States } = require('../utils/constants').TaskRunner;
const { getHeaders, stateForError, userAgent } = require('../utils');
const { patchToCart, patchCheckoutForm } = require('../utils/forms');
const pickVariant = require('../utils/pickVariant');

class FastCheckout extends Checkout {
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
        site: { url, apiKey },
        product: { variants },
        sizes,
        monitorDelay,
      },
      proxy,
      timers: { checkout: checkoutTimer },
    } = this._context;

    const variant = await pickVariant(variants, sizes, url, this._logger);

    this._logger.debug('Adding %j to cart', variant);
    if (!variant) {
      return {
        message: 'No size matched! Stopping...',
        nextState: States.ERROR,
      };
    }

    try {
      const res = await this._request(`/api/checkouts/${this.checkoutToken}.json`, {
        method: 'PATCH',
        agent: proxy ? new HttpsProxyAgent(proxy) : null,
        headers: {
          ...getHeaders({ url, apiKey }),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patchToCart(variant)),
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
          const ctd = this.getCtdCookie(this._jar);

          if (!ctd) {
            return { message: 'Polling queue', nextState: States.QUEUE };
          }

          try {
            await this._request(`${url}/throttle/queue?_ctd=${ctd}&_ctd_update=`, {
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

      if (body.checkout && body.checkout.line_items) {
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
        err.status,
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

  async submitCustomer() {
    const {
      task: {
        site: { url, apiKey },
        profile: { shipping, billing, payment, billingMatchesShipping },
        product: { variants },
      },
      proxy,
    } = this._context;

    try {
      const res = await this._request(`/api/checkouts/${this.checkoutToken}.json`, {
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
          const ctd = this.getCtdCookie(this._jar);

          if (!ctd) {
            return { message: 'Polling queue', nextState: States.QUEUE };
          }

          try {
            await this._request(`${url}/throttle/queue?_ctd=${ctd}&_ctd_update=`, {
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
      const res = await this._request(`/api/checkouts/${this.checkoutToken}/shipping_rates.json`, {
        method: 'GET',
        agent: proxy ? new HttpsProxyAgent(proxy) : null,
        headers: getHeaders({ url, apiKey }),
      });

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

  async submitPayment() {
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
          const ctd = this.getCtdCookie(this._jar);

          if (!ctd) {
            return { message: 'Polling queue', nextState: States.QUEUE };
          }

          try {
            await this._request(`${url}/throttle/queue?_ctd=${ctd}&_ctd_update=`, {
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

      if (match && /contact_information/i.test(match)) {
        return { message: 'Submitting information', nextState: States.SUBMIT_CUSTOMER };
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
          const ctd = this.getCtdCookie(this._jar);

          if (!ctd) {
            return { message: 'Polling queue', nextState: States.QUEUE };
          }

          try {
            await this._request(`${url}/throttle/queue?_ctd=${ctd}&_ctd_update=`, {
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

module.exports = FastCheckout;
