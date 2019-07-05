import HttpsProxyAgent from 'https-proxy-agent';

const { min } = require('lodash');

const { getHeaders, stateForError, userAgent, waitForDelay } = require('../utils');
const { addToCart, patchCheckoutForm } = require('../utils/forms');
const { States } = require('../utils/constants').TaskRunner;
const Checkout = require('../checkout');

/**
 * CHECKOUT STEPS:
 * 1. MONITOR
 * 2. ADD TO CART (POLL QUEUE – PROCEEDS TO #5)
 * 3. CREATE CHECKOUT (POLL QUEUE – PROCEEDS TO #5)
 * 4. PATCH CHECKOUT (POLL QUEUE – PROCEEDS TO #6)
 * 5. SHIPPING RATES
 * 6. POST CHECKOUT
 */
class FrontendCheckout extends Checkout {
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
          nextState: States.AddToCart,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      const redirectUrl = headers.get('location');
      this._logger.silly('FRONTEND CHECKOUT: Add to cart redirect url: %s', redirectUrl);

      if (redirectUrl) {
        if (redirectUrl.indexOf('stock_problems') > -1) {
          return { message: 'Running for restocks', nextState: States.AddToCart };
        }

        if (redirectUrl.indexOf('password') > -1) {
          this._delayer = await waitForDelay(monitorDelay);
          return { message: 'Password page', nextState: States.AddToCart };
        }

        if (redirectUrl.indexOf('throttle') > -1) {
          return { message: 'Waiting in queue', nextState: States.PollQueue };
        }
      }

      const body = await res.text();

      if (/cannot find variant/i.test(body)) {
        this._delayer = await waitForDelay(monitorDelay);
        return { message: 'Monitoring for product', nextState: States.AddToCart };
      }

      if (this.chosenShippingMethod.id && !this.needsPatched) {
        return { message: 'Posting payment', nextState: States.PostPayment };
      }
      return { message: 'Creating checkout', nextState: States.CreateCheckout };
    } catch (err) {
      this._logger.error(
        'FRONTEND CHECKOUT: %s Request Error..\n Step: Add to Cart.\n\n %j %j',
        err.status,
        err.message,
        err.stack,
      );
      const nextState = stateForError(err, {
        message: 'Adding to cart',
        nextState: States.AddToCart,
      });

      const message = err.status ? `Adding to cart - (${err.status})` : 'Adding to cart';

      return nextState || { message, nextState: States.AddToCart };
    }
  }

  async patchCheckout() {
    const {
      task: {
        site: { url, apiKey },
        profile: { billingMatchesShipping, shipping, billing, payment },
        username,
        password,
      },
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
        },
        body: JSON.stringify(
          patchCheckoutForm(billingMatchesShipping, shipping, billing, payment, this.captchaToken),
        ),
      });

      // Reset captcha token so we don't use it again
      this.captchaToken = '';

      const { status, headers } = res;

      const checkStatus = stateForError(
        { status },
        {
          message: 'Submitting information',
          nextState: States.PatchCheckout,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      const redirectUrl = headers.get('location');
      this._logger.silly('FRONTEND CHECKOUT: Patch checkout redirect url: %s', redirectUrl);
      if (!redirectUrl) {
        if (status >= 200 && status < 310) {
          this.needsPatched = false;
          if (this.chosenShippingMethod.id) {
            return { message: 'Posting payment', nextState: States.PostPayment };
          }
          return { message: 'Fetching shipping rates', nextState: States.ShippingRates };
        }
        return { message: 'Failed: Submitting information', nextState: States.Errored };
      }

      // check for redirects
      if (redirectUrl) {
        if (redirectUrl.indexOf('account') > -1) {
          if (username && password) {
            return { message: 'Logging in', nextState: States.Login };
          }
          return { message: 'Account required', nextState: States.Errored };
        }

        if (redirectUrl.indexOf('password') > -1) {
          return { message: 'Password page', nextState: States.CreateCheckout };
        }

        if (redirectUrl.indexOf('stock_problems') > -1) {
          // we can maybe find shipping rates meanwhile (if not found already) here
          return { message: 'Running for restocks', nextState: States.GetCheckout };
        }

        if (redirectUrl.indexOf('throttle') > -1) {
          return { message: 'Waiting in queue', nextState: States.PollQueue };
        }
      }

      const message = status ? `Submitting information - (${status})` : 'Submitting information';

      return { message, nextState: States.PatchCheckout };
    } catch (err) {
      this._logger.error(
        'FRONTEND CHECKOUT: %s Request Error..\n Step: Submiting Information.\n\n %j %j',
        err.status,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Submitting information',
        nextState: States.PatchCheckout,
      });

      const message = err.status
        ? `Submitting information - (${err.status})`
        : 'Submitting information';

      return nextState || { message, nextState: States.PatchCheckout };
    }
  }

  async shippingRates() {
    const {
      task: {
        site: { url },
        profile: {
          shipping: { country, province, zipCode },
        },
        monitorDelay,
      },
      proxy,
    } = this._context;

    try {
      const res = await this._request(
        `/cart/shipping_rates.json?shipping_address[zip]=${zipCode}&shipping_address[country]=${
          country.value
        }&shipping_address[province]=${province ? province.value : ''}`,
        {
          method: 'GET',
          agent: proxy ? new HttpsProxyAgent(proxy) : null,
          headers: {
            Origin: url,
            'User-Agent': userAgent,
          },
        },
      );

      const { status } = res;

      if (status === 422) {
        return { message: 'Country not supported', nextState: States.Errored };
      }

      const checkStatus = stateForError(
        { status },
        {
          message: 'Fetching shipping rates',
          nextState: States.ShippingRates,
        },
      );

      if (checkStatus) {
        return checkStatus;
      }

      const body = await res.json();

      if (body && body.errors) {
        this._logger.silly('FRONTEND CHECKOUT: Error getting shipping rates: %j', body.errors);
        this._delayer = await waitForDelay(1500);
        return { message: 'Polling for shipping rates', nextState: States.ShippingRates };
      }

      // eslint-disable-next-line camelcase
      if (body && body.shipping_rates) {
        const { shipping_rates: shippingRates } = body;
        shippingRates.forEach(rate => {
          this.shippingMethods.push(rate);
        });

        const cheapest = min(this.shippingMethods, rate => rate.price);
        const { name, price } = cheapest;
        const id = `${cheapest.source}-${encodeURIComponent(cheapest.name)}-${cheapest.price}`;
        this.chosenShippingMethod = { id, name };
        this._logger.silly('FRONTEND CHECKOUT: Using shipping rate: %s', name);

        this.prices.shipping = price;
        this._logger.silly('FRONTEND CHECKOUT: Shipping cost: %s', this.prices.shipping);

        return { message: 'Posting payment', nextState: States.PostPayment };
      }
      this._logger.silly('No shipping rates available, polling %d ms', monitorDelay);
      this._delayer = await waitForDelay(monitorDelay);
      return { message: 'Polling for shipping rates', nextState: States.ShippingRates };
    } catch (err) {
      this._logger.error(
        'FRONTEND CHECKOUT: %s Request Error..\n Step: Shipping Rates.\n\n %j %j',
        err.status,
        err.message,
        err.stack,
      );

      const nextState = stateForError(err, {
        message: 'Fetching shipping rates',
        nextState: States.ShippingRates,
      });

      const message = err.status
        ? `Fetching shipping rates - (${err.status})`
        : 'Fetching shipping rates';

      return nextState || { message, nextState: States.ShippingRates };
    }
  }
}
module.exports = FrontendCheckout;
