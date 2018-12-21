/**
 * Local class includes
 */
const Cart = require('./cart');
const Shipping = require('./shipping');
const Payment = require('./payment');
const Account = require('../account');
const Timer = require('../timer');
const { States } = require('../utils/constants').TaskRunner;
const { waitForDelay } = require('../utils');

class Checkout {
  /**
   * Task Runner States
   */
  static get States() {
    return {
      Started: 'STARTED',
      Stopped: 'STOPPED',
      LoginAccount: 'LOGIN_ACCOUNT',
      AddToCart: 'ADD_TO_CART',
      GetShippingRates: 'GET_SHIPPING_RATES',
      GeneratePaymentToken: 'GENERATE_PAYMENT_TOKEN',
      ProceedToCheckout: 'PROCEED_TO_CHECKOUT',
      CheckoutQueue: 'CHECKOUT_QUEUE',
      OutOfStock: 'OUT_OF_STOCK',
      Restock: 'RESTOCK',
      GetShipping: 'GET_SHIPPING',
      RequestCaptcha: 'REQUEST_CAPTCHA',
      PostShipping: 'POST_SHIPPING',
      Payment: 'PAYMENT',
      PaymentError: 'PAYMENT_ERROR',
      PaymentProcessing: 'PAYMENT_PROCESSING',
      PaymentFinished: 'PAYMENT_FINISHED',
    };
  }

  constructor(context) {
    /**
     * All data needed for monitor to run
     * This includes:
     * - current runner id
     * - current task
     * - current proxy
     * - whether or not we should abort
     * @type {TaskRunnerContext}
     */
    this._context = context;

    /**
     * ID of the given task runner
     */
    this._id = this._context.id;

    /**
     * Task Data for the running task
     * @type {TaskObject}
     */
    this._task = this._context.task;

    /**
     * Cookie jar to use for the task
     * @type {CookieJar}
     */
    this._jar = this._context.jar;

    /**
     * Proxy to run the task with
     * @type {String}
     */
    this._proxy = this._context.proxy;

    /**
     * Whether this task runner has aborted
     * @type {Boolean}
     */
    this._aborted = this._context.aborted;

    /**
     * Logger Instance
     */
    this._logger = this._context.logger;

    this._state = Checkout.States.Started;
    this._checkoutUrl = null;
    this._authToken = null;
    this._price = null;
    this._shippingValue = null;
    this._shippingOpts = null;
    this._paymentToken = null;
    this._paymentGateway = null;

    this._variantIndex = 0;
    this._runThroughs = 0;

    this.DELAYS = {
      CHECKOUT_QUEUE: 500,
      RESTOCK_DELAY: 650,
    };

    // eslint-disable-next-line global-require
    this._request = require('request-promise').defaults({
      timeout: 10000,
      jar: this._jar,
    });

    /**
     * Class Instantiations
     */
    this._timer = new Timer();
    this._cart = new Cart(context, this._timer, this._request);
    this._shipping = null;
    this._payment = null;
    this._account = new Account(context, this._timer, this._request);
  }

  /**
   * Checkout process started
   * @returns {STATE} next checkout state
   */
  async _handleStarted() {
    this._logger.verbose('CHECKOUT: Starting...');
    // if the site requires authentication,
    if (this._task.username && this._task.password) {
      return { message: 'Logging in', nextState: Checkout.States.LoginAccount };
    }
    return {
      message: `Found product: ${this._task.product.name}`,
      nextState: Checkout.States.AddToCart,
    };
  }

  async _handleLogin() {
    this._logger.verbose('CHECKOUT: Logging in...');
    const res = await this._account.login();
    if (res.errors) {
      return { message: 'Invalid login', nextState: Checkout.States.Stopped };
    }
    if (res === this._account.ACCOUNT_STATES.LoggedIn) {
      return { message: 'Logged in!', nextState: Checkout.States.AddToCart };
    }
    return { message: 'Unable to login', nextState: Checkout.States.Stopped };
  }

  /**
   * Add to cart
   * @returns {STATE} next checkout state
   */
  async _handleAddToCart() {
    this._logger.verbose('CHECKOUT: Adding to Cart...');
    const res = await this._cart.addToCart(
      this._task.product.variants[this._variantIndex]
    );

    if (res.errors) {
      this._logger.verbose('CHECKOUT: Errors in Add to Cart: %s', res.errors);
      return {
        message: 'Failed: add to cart',
        nextState: Checkout.States.Stopped,
      };
    }
    if (!res) {
      this._logger.verbose('CHECKOUT: Failed to Add to Cart');
      waitForDelay(this._task.errorDelay);
      return {
        message: 'Adding to cart',
        nextState: Checkout.States.AddToCart,
      };
    }
    this._price = this._cart._price;
    return {
      message: 'Proceeding to checkout',
      nextState: Checkout.States.GeneratePaymentToken,
    };
  }

  /**
   * Get payment token
   * @returns {STATE} next checkout state
   */
  async _handlePaymentToken() {
    this._logger.verbose('CHECKOUT: Generating Payment Token...');
    const res = await this._cart.getPaymentToken();
    if (res.errors) {
      return {
        message: 'Failed: generating payment token',
        nextState: Checkout.States.Stopped,
      };
    }
    if (!res.paymentToken) {
      this._logger.verbose('CHECKOUT: Failed fetching payment token');
      return {
        message: 'Failed: generating payment token',
        nextState: Checkout.States.GeneratePaymentToken,
      };
    }
    this._paymentToken = res.paymentToken;
    return {
      message: 'Generating payment token',
      nextState: Checkout.States.ProceedToCheckout,
    };
  }

  /**
   * Get checkout data
   * @returns {STATE} next checkout state
   */
  async _handleProceedToCheckout() {
    this._logger.verbose('CHECKOUT: Proceeding to Checkout...');
    const res = await this._cart.proceedToCheckout();
    if (res.errors) {
      this._logger.verbose('CHECKOUT: Errors: %s', res.errors);
      return {
        message: 'Failed: unable to get checkout',
        nextState: Checkout.States.Stopped,
      };
    }
    if (res.state === this._cart.CART_STATES.CheckoutQueue) {
      return {
        message: 'Waiting in queue',
        nextState: Checkout.States.CheckoutQueue,
      };
    }
    if (res.state === this._cart.CART_STATES.OutOfStock) {
      return {
        message: 'Running for restocks',
        nextState: Checkout.States.OutOfStock,
      };
    }
    if (res.state === this._cart.CART_STATES.Success) {
      // eslint-disable-next-line prefer-destructuring
      this._checkoutUrl = res.checkoutUrl.split('?')[0];
      this._authToken = res.authToken;

      this._shipping = new Shipping(
        this._context,
        this._timer,
        this._request,
        this._checkoutUrl,
        this._authToken,
        this._shippingValue
      );
      return {
        message: 'Submitting shipping',
        nextState: Checkout.States.GetShipping,
      };
    }
    return {
      message: 'Unknown error, stopping.',
      nextState: Checkout.States.Stopped,
    };
  }

  async _handleCheckoutQueue() {
    this._logger.verbose('CHECKOUT: Handling Checkout Queue...');
    this._logger.silly('TODO: Need to Implement this!');
    this._waitForDelay(this.DELAYS.CHECKOUT_QUEUE);
    // return same message to prevent blank log messages
    // this will make it so `Waiting in queue` is shown until
    // the queue is over.
    return {
      message: 'Waiting in queue',
      nextState: Checkout.States.ProceedToCheckout,
    };
  }

  /**
   * Handle state `OutOfStock`
   * @returns {STATE} next checkout `Restock`
   */
  async _handleOutOfStock() {
    this._logger.verbose('CHECKOUT: Handling Out of Stock...');
    return {
      message: 'Running for restocks',
      nextState: Checkout.States.Restock,
    };
  }

  /**
   * Run
   */
  async _handleRestocks() {
    // run through each size, finally run restocks on first size if all OOS
    if (this._task.sizes.length > 1 && this._runThroughs === 0) {
      this._variantIndex += 1;
      if (this._variantIndex >= this._task.sizes.length) {
        this._variantIndex = 0;
        this._runThroughs += 1;
      }
      // TODO - make a CartManager that will be able to handle multiple carts
      // create background thread to run for restocks, and check next size?
      this._logger.info('Swapping to Next Size...');
      const res = await this._cart.clearCart();

      if (res.errors) {
        return {
          message: 'Failed: clearing cart',
          nextState: Checkout.States.Restock,
        };
      }

      if (res.cleared) {
        return {
          message: 'Adding next size to cart',
          nextState: Checkout.States.AddToCart,
        };
      }
      return {
        message: 'Failed: swapping to next size',
        nextState: Checkout.States.Stopped,
      };
    }
    // run restocks for the one size..
    this._logger.info('Running for Restocks');
    waitForDelay(this.DELAYS.RESTOCK_DELAY);
    return {
      message: 'Running for restocks',
      nextState: Checkout.States.ProceedToCheckout,
    };
  }

  /**
   * Submit `GET` shipping details
   * @returns {STATE} next checkout state
   */
  async _handleGetShipping() {
    this._logger.verbose('CHECKOUT: Starting Shipping...');
    let opts = await this._shipping.getShippingOptions();
    if (opts.errors) {
      return {
        message: 'Failed: getting shipping rates',
        nextState: Checkout.States.Stopped,
      };
    }
    this._authToken = opts.newAuthToken;

    if (opts.captcha) {
      this._logger.info('Requesting to solve captcha...');
      return {
        message: 'Waiting for Captcha',
        nextState: Checkout.States.RequestCaptcha,
      };
    }

    this._logger.verbose('Captcha Bypassed, Proceeding with Shipping...');
    opts = await this._shipping.submitShippingOptions(this._authToken, '');
    if (opts.errors) {
      return {
        message: 'Failed: submitting shipping',
        nextState: Checkout.States.Stopped,
      };
    }

    this._shippingOpts = {
      type: opts.type,
      value: opts.value,
      authToken: opts.authToken,
    };

    return {
      message: 'Posting shipping',
      nextState: Checkout.States.PostShipping,
    };
  }

  /**
   * Submit `POST` Shipping details
   */
  async _handlePostShipping() {
    this._logger.verbose('CHECKOUT: Continuing with Shipping...');
    const { type, value, authToken } = this._shippingOpts;
    const res = await this._shipping.submitShipping(type, value, authToken);
    if (res.errors) {
      return {
        message: 'Failed: posting shipping',
        nextState: Checkout.States.Stopped,
      };
    }

    if (res.paymentGateway && res.newAuthToken) {
      this._logger.info('Proceeding to submit payment');
      this._authToken = res.newAuthToken;
      this._paymentGateway = res.paymentGateway;
      this._price = res.price;
      this._payment = new Payment(
        this._context,
        this._timer,
        this._request,
        this._checkoutUrl,
        this._authToken,
        this._price,
        this._paymentGateway,
        this._paymentToken,
        this._shippingValue,
        this._captchaResponse
      );
      return { message: 'Posting payment', nextState: Checkout.States.Payment };
    }
    this._logger.info('Unable to submit shipping!');
    return {
      message: 'Failed: posting shipping',
      nextState: Checkout.States.Stopped,
    };
  }

  /**
   * Submit shipping details
   * @returns {STATE} next checkout state
   */
  async _handlePayment() {
    this._logger.verbose('CHECKOUT: Submitting Payment...');
    const res = await this._payment.submit();
    if (res.errors) {
      // TODO - not sure if this needs to return { nextState: Checkout.States.Stopped } at all, haven't been able to reach here.
      throw new Error(res.errors);
    }

    if (res === this._payment.PAYMENT_STATES.Error) {
      this._context.status = 'Failed: submitting payment';
      return {
        message: this._context.status,
        nextState: Checkout.States.Stopped,
      };
    }
    if (res === this._payment.PAYMENT_STATES.Processing) {
      this._context.status = 'Success: Payment processing, check email';
      return {
        message: this._context.status,
        nextState: Checkout.States.Stopped,
      };
    }
    if (res === this._payment.PAYMENT_STATES.Declined) {
      this._context.status = 'Failed: payment declined';
      return {
        message: this._context.status,
        nextState: Checkout.States.PaymentError,
      };
    }
    if (res === this._payment.PAYMENT_STATES.Success) {
      this._context.status = 'Success: payment processed';
      return {
        message: this._context.status,
        nextState: Checkout.States.Stopped,
      };
    }
    this._context.status = 'Failed: unknown error, please send logs';
    return {
      message: this._context.status,
      nextState: Checkout.States.Stopped,
    };
  }

  async _handleStopped() {
    this._logger.verbose('CHECKOUT: Stopping checkout process...');
    return { message: 'Stopping task...', nextState: Checkout.States.Stopped };
  }

  async _handleStepLogic(currentState) {
    async function defaultHandler() {
      throw new Error('Reached Unknown State!');
    }
    this._logger.verbose('CHECKOUT: Handling State: %s ...', currentState);
    const stateMap = {
      [Checkout.States.Started]: this._handleStarted,
      [Checkout.States.LoginAccount]: this._handleLogin,
      [Checkout.States.AddToCart]: this._handleAddToCart,
      [Checkout.States.GeneratePaymentToken]: this._handlePaymentToken,
      [Checkout.States.ProceedToCheckout]: this._handleProceedToCheckout,
      [Checkout.States.OutOfStock]: this._handleOutOfStock,
      [Checkout.States.Restock]: this._handleRestocks,
      [Checkout.States.CheckoutQueue]: this._handleCheckoutQueue,
      [Checkout.States.GetShipping]: this._handleGetShipping,
      [Checkout.States.PostShipping]: this._handlePostShipping,
      [Checkout.States.RequestCaptcha]: this._handleRequestCaptcha,
      [Checkout.States.Payment]: this._handlePayment,
      [Checkout.States.Stopped]: this._handleStopped,
    };

    const handler = stateMap[currentState] || defaultHandler;
    // eslint-disable-next-line no-return-await
    return await handler.call(this);
  }

  async run() {
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return { nextState: States.Aborted };
    }

    const res = await this._handleStepLogic(this._state);
    this._logger.verbose('CHECKOUT: Next State chosen as: %s', res.nextState);
    if (res.nextState === Checkout.States.Error) {
      this._logger.verbose('CHECKOUT: Completed with errors: %j', res.errors);
      return {
        message: res.errors,
        nextState: States.Errored,
      };
    }
    if (res) {
      this._state = res.nextState;
    }

    if (
      this._state !== Checkout.States.Stopped &&
      this._state !== Checkout.States.PaymentProcessing &&
      this._state !== Checkout.States.Error
    ) {
      return {
        message: res.message,
        nextState: States.Checkout,
      };
    }

    return {
      message: res.message,
      nextState: States.Stopped,
    };
  }
}

module.exports = Checkout;
