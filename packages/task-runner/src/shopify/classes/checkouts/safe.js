/* eslint-disable no-return-assign */
/* eslint-disable class-methods-use-this */
import HttpsProxyAgent from 'https-proxy-agent';
import cheerio from 'cheerio';
import Checkout from '../checkout';

const { States } = require('../utils/constants').TaskRunner;
const { getHeaders, stateForError, userAgent } = require('../utils');
const { addToCart } = require('../utils/forms');
const pickVariant = require('../utils/pickVariant');

class SafeCheckout extends Checkout {
  async addToCart() {
    const {
      task: {
        site: { name, url },
        product: { variants, barcode, hash },
        size,
        monitorDelay,
      },
      proxy,
    } = this._context;

    let properties = {};

    if (barcode) {
      properties = {
        ...properties,
        barcode: barcode[0],
      };
    }

    const variant = await pickVariant(variants, size, url, this._logger);

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
        headers: {
          'User-Agent': userAgent,
          'content-type': 'application/json',
          'sec-fetch-mode': 'navigate',
          'sec-fetch-site': 'same-origin',
          'sec-fetch-user': '?1',
        },
        body: JSON.stringify(addToCart(id, name, hash, properties)),
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

      if (/eflash/i.test(url) || /palace/i.test(url)) {
        return { message: 'Creating checkout', nextState: States.CREATE_CHECKOUT };
      }
      return { message: 'Going to checkout', nextState: States.GO_TO_CHECKOUT };
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
        product: { variants },
        site: { url, apiKey },
      },
      proxy,
    } = this._context;

    let params = `updates%5B%5D=1&checkout=Checkout`;

    if (/eflash/i.test(url)) {
      params = `updates%5B%5D=1&checkout=Checkout&attributes%5Bcheckout_clicked%5D=true`;
    }

    if (/palace/i.test(url)) {
      params = `updates%5B${variants[0]}%5D=1&terms=on&checkout=Checkout`;
    }

    if (this.note) {
      params += `&note=${this.note}`;
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
        body: params,
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
        if (/password/i.test(redirectUrl)) {
          return { message: 'Password page', delay: true, nextState: States.CREATE_CHECKOUT };
        }

        if (/throttle/i.test(redirectUrl)) {
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
          if (/eflash/i.test(url) || /palace/i.test(url)) {
            return { message: 'Going to checkout', nextState: States.GO_TO_CHECKOUT };
          }
          return { message: 'Waiting for product', nextState: States.WAIT_FOR_PRODUCT };
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

      const redirectUrl = headers.get('location');
      this._logger.silly(`CHECKOUT: ${state} redirect url: %s`, redirectUrl);

      // check if redirected
      if (redirectUrl) {
        if (/password/i.test(redirectUrl)) {
          return { message: 'Password page', delay: true, nextState: state };
        }

        if (/throttle/i.test(redirectUrl)) {
          let newUrl = null;

          // if redirect has the cookie, let's just use the redirect
          if (/_ctd/.test(redirectUrl)) {
            newUrl = redirectUrl;
          }

          // else, try to find the cookie in our jar
          const ctd = this.getCtdCookie(this._jar);

          // if neither, just jump to the queue
          if (!ctd && !newUrl) {
            return { message: 'Polling queue', nextState: States.QUEUE };
          }

          // if it doesn't have the cookie, and our jar does, build the new url
          if (!newUrl) {
            newUrl = `${url}/throttle/queue?_ctd=${ctd}&_ctd_update=`;
          }

          try {
            await this._request(newUrl, {
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
          this._emitTaskEvent({ message: `Out of stock! Delaying ${monitorDelay}ms` });
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

      const body = await res.text();

      const $ = cheerio.load(body);

      this.protection = await this.parseBotProtection($);
      this.authToken = $('form.edit_checkout input[name=authenticity_token]').attr('value');

      if (/Getting available shipping rates/i.test(body)) {
        return { message: 'Polling shipping rates', nextState: States.GO_TO_SHIPPING };
      }

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
        site: { url, apiKey },
        profile: { shipping, payment },
        monitorDelay,
      },
      proxy,
    } = this._context;

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
      params += '&field_start=hidden';
      this.protection.map(hash => (params += `&${hash}=`));
      params += '&field_end=hidden';
      params += `&${this.checkoutToken}-count=${this.protection.length}`;
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
          let newUrl = null;

          // if redirect has the cookie, let's just use the redirect
          if (/_ctd/.test(redirectUrl)) {
            newUrl = redirectUrl;
          }

          // else, try to find the cookie in our jar
          const ctd = this.getCtdCookie(this._jar);

          // if neither, just jump to the queue
          if (!ctd && !newUrl) {
            return { message: 'Polling queue', nextState: States.QUEUE };
          }

          // if it doesn't have the cookie, and our jar does, build the new url
          if (!newUrl) {
            newUrl = `${url}/throttle/queue?_ctd=${ctd}&_ctd_update=`;
          }

          try {
            await this._request(newUrl, {
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
          let newUrl = null;

          // if redirect has the cookie, let's just use the redirect
          if (/_ctd/.test(redirectUrl)) {
            newUrl = redirectUrl;
          }

          // else, try to find the cookie in our jar
          const ctd = this.getCtdCookie(this._jar);

          // if neither, just jump to the queue
          if (!ctd && !newUrl) {
            return { message: 'Polling queue', nextState: States.QUEUE };
          }

          // if it doesn't have the cookie, and our jar does, build the new url
          if (!newUrl) {
            newUrl = `${url}/throttle/queue?_ctd=${ctd}&_ctd_update=`;
          }

          try {
            await this._request(newUrl, {
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
        site: { url, apiKey },
        profile: { billing, billingMatchesShipping },
        monitorDelay,
      },
      timers: { checkout },
      proxy,
    } = this._context;

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
          let newUrl = null;

          // if redirect has the cookie, let's just use the redirect
          if (/_ctd/.test(redirectUrl)) {
            newUrl = redirectUrl;
          }

          // else, try to find the cookie in our jar
          const ctd = this.getCtdCookie(this._jar);

          // if neither, just jump to the queue
          if (!ctd && !newUrl) {
            return { message: 'Polling queue', nextState: States.QUEUE };
          }

          // if it doesn't have the cookie, and our jar does, build the new url
          if (!newUrl) {
            newUrl = `${url}/throttle/queue?_ctd=${ctd}&_ctd_update=`;
          }

          try {
            await this._request(newUrl, {
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

  async completePayment() {
    const {
      task: {
        site: { url, apiKey },
        monitorDelay,
      },
      timers: { checkout },
      proxy,
    } = this._context;

    let params = `_method=patch&authenticity_token=${this.authToken}&complete=1&button=`;

    if (this.prices.total) {
      params += `&checkout%5Btotal_price%5D=${this.prices.total}`;
    }

    params +=
      '&checkout%5Bclient_details%5D%5Bbrowser_width%5D=927&checkout%5Bclient_details%5D%5Bbrowser_height%5D=967&checkout%5Bclient_details%5D%5Bjavascript_enabled%5D=1';

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

      const { status } = res;

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
          return { message: 'Completing payment', nextState: States.GO_TO_REVIEW };
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

      return { message: 'Processing payment', nextState: States.COMPLETE_PAYMENT };
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
}

module.exports = SafeCheckout;
