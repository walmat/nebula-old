/* eslint-disable no-return-assign */
/* eslint-disable class-methods-use-this */
import HttpsProxyAgent from 'https-proxy-agent';
import cheerio from 'cheerio';
import Checkout from '../checkout';

const fs = require('fs');
const path = require('path');

const { States } = require('../utils/constants').TaskRunner;
const { getHeaders, stateForError, userAgent } = require('../utils');
const { addToCart } = require('../utils/forms');

class SafeCheckout extends Checkout {
  async login() {
    const { message, shouldBan, nextState } = await super.login();

    switch (nextState) {
      case States.CREATE_CHECKOUT: {
        // if (!this._context.task.product.variants || !this._context.task.product.variants.length) {
        //   return {
        //     message: 'Waiting for product',
        //     nextState: States.WAIT_FOR_PRODUCT,
        //   };
        // }
        // return {
        //   message: 'Adding to cart',
        //   nextState: States.ADD_TO_CART,
        // };
        return {
          message: 'Parsing products',
          nextState: States.MONITOR,
        };
      }
      default: {
        return {
          message,
          shouldBan,
          nextState,
        };
      }
    }
  }

  async addToCart() {
    const {
      task: {
        site: { name },
        product: { variants, hash },
        monitorDelay,
      },
      proxy,
    } = this._context;

    try {
      const res = await this._request('/cart/add.js', {
        method: 'POST',
        headers: {
          'User-Agent': userAgent,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addToCart(variants[0], name, hash)),
        agent: proxy ? new HttpsProxyAgent(proxy) : null,
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
        if (redirectUrl.indexOf('stock_problems') > -1) {
          return { message: 'Running for restocks', nextState: States.ADD_TO_CART };
        }

        if (redirectUrl.indexOf('password') > -1) {
          return { message: 'Password page', nextState: States.ADD_TO_CART };
        }

        if (redirectUrl.indexOf('throttle') > -1) {
          return { message: 'Waiting in queue', nextState: States.QUEUE };
        }
      }

      const body = await res.text();

      if (/cannot find variant/i.test(body)) {
        this._emitTaskEvent({ message: `Variant not live, delaying ${monitorDelay}ms` });
        return {
          message: `Variant not live, delaying ${monitorDelay}ms`,
          nextState: States.ADD_TO_CART,
        };
      }

      if (this.chosenShippingMethod.id && this.isRestocking) {
        return { message: 'Submitting payment', nextState: States.SUBMIT_PAYMENT };
      }
      return { message: 'Going to checkout', nextState: States.GO_TO_CHECKOUT };
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

  async getCheckout(state, message, step, prevStep) {
    const {
      task: {
        site: { url, apiKey },
      },
      proxy,
    } = this._context;

    const stepUrl = prevStep
      ? `/${this.storeId}/checkouts/${this.checkoutToken}?step=${step}?previous_step=${prevStep}`
      : `/${this.storeId}/checkouts/${this.checkoutToken}?step=${step}`;

    console.log(stepUrl);

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

      const redirectUrl = headers.get('location');
      this._logger.silly(`CHECKOUT: ${state} redirect url: %s`, redirectUrl);

      // check if redirected
      if (redirectUrl) {
        if (/password/i.test(redirectUrl)) {
          return { message: 'Password page', nextState: state };
        }

        if (/throttle/i.test(redirectUrl)) {
          return { message: 'Waiting in queue', nextState: States.QUEUE };
        }
      }

      const body = await res.text();

      console.log(body);

      fs.writeFileSync(path.join(__dirname, `${step}.html`), body);

      const $ = cheerio.load(body);

      this.protection = await this.parseBotProtection($);
      this.authToken = $('form.edit_checkout input[name=authenticity_token]').attr('value');

      if (!this.checkoutKey) {
        const match = body.match(
          /<meta\s*name="shopify-checkout-authorization-token"\s*content="(.*)"/,
        );

        if (match) {
          [, this.checkoutKey] = match;
          this._logger.silly('CHECKOUT: Checkout authorization key: %j', this.checkoutKey);
        }
      }

      if (/captcha/i.test(body)) {
        this._emitTaskEvent({ message: 'Captcha found!' });
        this.needsCaptcha = true;
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
        site: { url, apiKey },
        profile: { shipping, payment },
        monitorDelay,
      },
      proxy,
    } = this._context;

    const form = {
      _method: 'patch',
      authenticity_token: this.authToken,
      step: 'contact_information',
      previous_step: 'contact_information',
      'g-recaptcha-response': this.captchaToken,
      button: '',
      checkout: {
        secret: true,
        email: payment.email,
        buyer_accepts_marketing: 0,
        shipping_address: {
          first_name: shipping.firstName,
          last_name: shipping.lastName,
          address1: shipping.address,
          address2: shipping.apt,
          city: shipping.city,
          country: shipping.country.value,
          province: shipping.province ? shipping.province.value : '',
          state: shipping.province ? shipping.province.value : '',
          zip: shipping.zipCode,
          phone: shipping.phone,
        },
        client_details: {
          browser_width: 1128,
          browser_height: 386,
          javascript_enabled: 1,
        },
      },
    };

    if (this.protection.length) {
      this.protection.map(hash => (form[hash] = ''));
      form[`${this.checkoutToken}-count`] = this.protection.length;
    }

    console.log(form);

    try {
      const res = await this._request(
        `/${this.storeId}/checkouts/${this.checkoutToken}?step=shipping_method&previous_step=contact_information`,
        {
          method: 'POST',
          agent: proxy ? new HttpsProxyAgent(proxy) : null,
          redirect: 'manual',
          follow: 0,
          headers: {
            ...getHeaders({ url, apiKey }),
            Connection: 'Keep-Alive',
            'Upgrade-Insecure-Requests': '1',
            'X-Shopify-Storefront-Access-Token': `${apiKey}`,
          },
          body: form,
        },
      );

      const { status, headers } = res;

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

      const redirectUrl = headers.get('location');
      this._logger.silly(`CHECKOUT: Submitting information redirect url: %s`, redirectUrl);

      // check if redirected
      if (redirectUrl) {
        if (/stock_problems/i.test(redirectUrl)) {
          return {
            message: `Out of stock, delaying ${monitorDelay}ms`,
            nextState: States.SUBMIT_CUSTOMER,
          };
        }

        if (/password/i.test(redirectUrl)) {
          return { message: 'Password page', nextState: States.SUBMIT_CUSTOMER };
        }

        if (/throttle/i.test(redirectUrl)) {
          return { message: 'Waiting in queue', nextState: States.QUEUE };
        }
      }

      return { message: 'Fetching shipping rates', nextState: States.GO_TO_SHIPPING };
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

  async submitShipping() {
    const {
      task: {
        site: { url, apiKey },
        monitorDelay,
      },
      proxy,
    } = this._context;

    const { id } = this.chosenShippingMethod;

    const form = {
      _method: 'patch',
      authenticity_token: this.authToken,
      step: 'payment_method',
      previous_step: 'shipping_method',
      button: '',
      checkout: {
        shipping_rate: {
          id,
        },
        client_details: {
          browser_width: 1128,
          browser_height: 386,
          javascript_enabled: 1,
        },
      },
    };

    if (this.protection.length) {
      this.protection.map(hash => (form[hash] = ''));

      form[`${this.checkoutToken}-count`] = this.protection.length;
    }

    try {
      const res = await this._request(
        `/${this.storeId}/checkouts/${this.checkoutToken}?step=shipping_method`,
        {
          method: 'POST',
          agent: proxy ? new HttpsProxyAgent(proxy) : null,
          redirect: 'manual',
          follow: 0,
          headers: {
            ...getHeaders({ url, apiKey }),
            Connection: 'Keep-Alive',
            'Upgrade-Insecure-Requests': '1',
            'X-Shopify-Storefront-Access-Token': `${apiKey}`,
          },
          body: form,
        },
      );

      const { status, headers } = res;

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

      const redirectUrl = headers.get('location');
      this._logger.silly(`CHECKOUT: Submitting shipping redirect url: %s`, redirectUrl);

      // check if redirected
      if (redirectUrl) {
        if (/stock_problems/i.test(redirectUrl)) {
          return {
            message: `Out of stock, delaying ${monitorDelay}ms`,
            nextState: States.SUBMIT_SHIPPING,
          };
        }

        if (/password/i.test(redirectUrl)) {
          return { message: 'Password page', nextState: States.SUBMIT_SHIPPING };
        }

        if (/throttle/i.test(redirectUrl)) {
          return { message: 'Waiting in queue', nextState: States.QUEUE };
        }
      }

      return { message: 'Submitting payment', nextState: States.GO_TO_PAYMENT };
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
        site: { url, apiKey },
        profile: { billing, billingMatchesShipping },
      },
      proxy,
    } = this._context;

    let form = {
      _method: 'patch',
      authenticity_token: this.authToken,
      previous_step: 'payment_method',
      step: '',
      complete: 1,
      s: this.paymentToken,
      checkout: {
        payment_gateway: this.paymentGateway,
        credit_card: {
          vault: false,
        },
        different_billing_address: billingMatchesShipping,
        remember_me: false,
        vault_phone: billing.phone,
        total_price: this.prices.total,
        client_details: {
          browser_width: 1128,
          browser_height: 386,
          javascript_enabled: 1,
        },
      },
    };

    if (!billingMatchesShipping) {
      form = {
        ...form,
        checkout: {
          ...form.checkout,
          checkout: {
            billing_address: {
              first_name: billing.firstName,
              last_name: billing.lastName,
              address1: billing.address,
              address2: billing.apt,
              company: '',
              city: billing.city,
              country: billing.country.value,
              province: billing.province ? billing.province.value : '',
              state: billing.province ? billing.province.value : '',
              zip: billing.zipCode,
              phone: billing.phone,
            }
          }
        }
      }
    }

    if (this.protection.length) {
      this.protection.map(hash => (form[hash] = ''));

      form[`${this.checkoutToken}-count`] = this.protection.length;
    }

    try {
      const res = await this._request(
        `/${this.storeId}/checkouts/${this.checkoutToken}?step=shipping_method`,
        {
          method: 'POST',
          agent: proxy ? new HttpsProxyAgent(proxy) : null,
          redirect: 'manual',
          follow: 0,
          headers: {
            ...getHeaders({ url, apiKey }),
            Connection: 'Keep-Alive',
            'Upgrade-Insecure-Requests': '1',
            'X-Shopify-Storefront-Access-Token': `${apiKey}`,
          },
          body: form,
        },
      );

      // TODO: stock_problems, password, processing, etc...

      return { message: 'Processing payment', nextState: States.PROCESS_PAYMENT };
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

  async completePayment() {
    const {
      task: {
        site: { url, apiKey },
      },
      proxy,
    } = this._context;

    const form = {
      _method: 'patch',
      authenticity_token: this.authToken,
      complete: 1,
      button: '',
      checkout: {
        total_price: this.prices.total,
        client_details: {
          browser_width: 1128,
          browser_height: 386,
          javascript_enabled: 1,
        },
      },
    };

    if (this.protection.length) {
      this.protection.map(hash => (form[hash] = ''));

      form[`${this.checkoutToken}-count`] = this.protection.length;
    }

    try {
      const res = await this._request(
        `/${this.storeId}/checkouts/${this.checkoutToken}?step=review`,
        {
          method: 'POST',
          agent: proxy ? new HttpsProxyAgent(proxy) : null,
          redirect: 'manual',
          follow: 0,
          headers: {
            ...getHeaders({ url, apiKey }),
            Connection: 'Keep-Alive',
            'Upgrade-Insecure-Requests': '1',
            'X-Shopify-Storefront-Access-Token': `${apiKey}`,
          },
          body: form,
        },
      );

      // TODO: stock_problems, password, processing, etc...

      return { message: 'Processing payment', nextState: States.PROCESS_PAYMENT };
    } catch (err) {
      this._logger.error(
        'FRONTEND CHECKOUT: %s Request Error..\n Step: Submit shipping information .\n\n %j %j',
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

  /**
   * *THIS IS JUST THE CHECKOUT PROCESS*
   * 1.* Login
   * 1. Add to cart
   * 2. Create checkout
   * 3. Go to checkout
   * 3*. Request captcha
   * 4. Submit `customer_information` step
   * 5. Go to shipping
   * 6. Submit `shipping_method` step
   * 7. Go to payment
   * 8. Submit `payment_method` step
   * 8.* Complete payment (not always needed)
   * 9. Process payment
   */
}

module.exports = SafeCheckout;
