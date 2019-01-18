
const { waitForDelay } = require('./classes/utils');
const { getCheckoutMethod } = require('./classes/checkouts');
  // MARK: State Machine Step Logic

  async _handleStarted() {
    this._logger.silly('Starting task setup');

    if (this._context.task.username && this._context.task.password) {
      this._emitTaskEvent({
        message: 'Logging in...',
      });
      return States.Login;
    }
    this._emitTaskEvent({
      message: 'Starting Task Setup',
    });
    return States.PaymentToken;
  }

  // Task Setup Promise 2 - create checkout session
  createCheckout() {
    return new Promise(async (resolve, reject) => {
      const checkout = await this._checkout.handleCreateCheckout();
      if (!checkout.res || checkout.error) {
        reject(checkout.code);
      }
      resolve(checkout.res);
    });
  }
  async _handleLogin() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const { monitorDelay } = this._context.task;

    const res = await this._checkout.login();

    if (res.status) {
      switch (res.status) {
        case 403:
        case 429:
        case 430: {
          // soft ban
          this.shouldBanProxy = true;
          this._emitTaskEvent({
            message: 'Swapping proxy',
          });
          return States.SwapProxies;
        }
        default: {
          this._emitTaskEvent({
            message: 'Failed: Logging in',
          });
          return States.Stopped;
        }
      }
    }

  login() {
    return new Promise(async (resolve, reject) => {
      const loggedIn = await this._checkout.handleLogin();
      if (!loggedIn) {
        reject(loggedIn);
      }
      resolve(loggedIn);
    if (res.errors) {
      if (res.errors === CheckoutErrorCodes.InvalidCaptchaToken) {
        this._emitTaskEvent({
          message: 'Waiting for captcha',
        });
        return States.RequestCaptcha;
      }
      if (res.errors === CheckoutErrorCodes.Password) {
        this._emitTaskEvent({
          message: 'Password page',
        });
        await waitForDelay(monitorDelay);
        return States.Login;
      }
      this._emitTaskEvent({
        message: 'Failed: Logging in',
      });
      return States.Stopped;
    }
    this._emitTaskEvent({
      message: 'Fetching payment token',
    });
    return States.PaymentToken;
  }

  async _handlePaymentToken() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    this._logger.silly('Starting task setup');
    this._emitTaskEvent({
      message: 'Starting Task Setup',
    });
    return States.TaskSetup;

    const res = await this._checkout.paymentToken();

    if (!res) {
      this._logger.verbose('Failed: fetching payment token');
      return States.Stopped;
    }
    this._emitTaskEvent({
      message: 'Creating Checkout',
    });
    return States.CreateCheckout;
  }

  async _handleCreateCheckout() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const { username, password } = this._context.task;
    const promises =
      username && password
        ? [this.generatePaymentToken(), this.createCheckout(), this.login()]
        : [this.generatePaymentToken(), this.createCheckout()];
    this._logger.silly('Running Task Setup Promises');
    const results = await Promise.all(promises.map(reflect));
    this._logger.silly('Async promises results: %j', results);
    const failed = results.filter(res => res.status === 'rejected');
    if (failed.length > 0) {
      this._logger.silly('Task setup failed: %j', failed);
      // check banned status
      const banned = failed.some(f => f.e === 403 || f.e === 429 || f.e === 430);
      if (banned) {
        return States.SwapProxies;
      }

      // check queue
      const queue = failed.some(f => f.e === 303);
      if (queue) {
        this._context.setup = false;
        this._emitTaskEvent({
          message: 'Waiting in queue',
        });
        return States.Queue;
      }

      // if not queue, but something failed, let's do task setup later
      this._context.setup = false;
      this._logger.verbose('Completing task setup later');
      this._emitTaskEvent({
        message: 'Doing task setup later',
      });
    } else {
      this._logger.verbose('Task setup successfully completed');
      this._context.setup = true;
    }
    this._emitTaskEvent({
      message: 'Monitoring for product...',
    });
    return States.Monitor;

    const res = await this._checkout.createCheckout();

    if (res.status) {
      switch (res.status) {
        case 303: {
          this._emitTaskEvent({
            message: 'Waiting in queue',
          });
          return States.PollQueue;
        }
        case 403:
        case 429:
        case 430: {
          // soft ban
          this.shouldBanProxy = true;
          this._emitTaskEvent({
            message: 'Swapping proxy',
          });
          return States.SwapProxies;
        }
        default: {
          this._emitTaskEvent({
            message: 'Failed: Creating checkout',
          });
          return States.Stopped;
        }
      }
    }

    if (res.errors) {
      this._emitTaskEvent({
        message: 'Failed: Creating checkout',
      });
      return States.Stopped;
    }
    this._emitTaskEvent({
      message: 'Monitoring for product...',
    });
    return States.Monitor;
  }

  async _handlePollQueue() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const res = await this._checkout.pollQueue();

    if (res.status) {
      this._logger.verbose('Polling queue responded with statusCode: %d', res.status);
      switch (res.status) {
        case 303: {
          this._emitTaskEvent({
            message: 'Waiting in queue',
          });
          await waitForDelay(1000);
          return States.PollQueue;
        }
        case 403:
        case 429:
        case 430:
          // soft ban
          this.shouldBanProxy = true;
          this._emitTaskEvent({
            message: 'Swapping proxy',
          });
          return States.SwapProxies;
        default:
          // stop if not a soft ban
          this._emitTaskEvent({
            message: 'Error while handling queue, stopping..',
          });
          return States.Stopped;
      }
    }
    // we're still in queue
    if (res.errors) {
      this._emitTaskEvent({
        message: 'Failed: Polling queue',
      });
      return States.Stopped;
    }
    // otherwise, we're out of queue and can proceed to monitor.
    return States.Monitor;
  }

  async _handleMonitor() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const res = await this._monitor.run();
    if (res.errors) {
      this._logger.verbose('Monitor Handler completed with errors: %j', res.errors);
      this._emitTaskEvent({
        message: 'Error monitoring product...',
        errors: res.errors,
      });
      await this._waitForErrorDelay();
    }
    this._emitTaskEvent({
      message: res.message,
    });
    if (res.nextState === States.SwapProxies) {
      this.shouldBanProxy = res.shouldBan; // Set a flag to ban the proxy if necessary
    }
    // Monitor will be in charge of choosing the next state
    return res.nextState;
  }

  async _handleSwapProxies() {
    try {
      this._logger.verbose('Waiting for new proxy...');
      const proxy = await this.swapProxies();
      // Update the references
      this.proxy = proxy;
      this._context.proxy = proxy.proxy;
      this.shouldBanProxy = false; // reset ban flag
    } catch (err) {
      this._logger.verbose('Swap Proxies Handler completed with errors: %s', err, err);
      this._emitTaskEvent({
        message: 'Error Swapping Proxies! Retrying...',
        errors: err,
      });
      await this._waitForErrorDelay();
    }
    // Go back to previous state
    return this._prevState;
  }

  async _handlePatchCart() {
  async _handleAddToCart() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }
    const { monitorDelay, errorDelay } = this._context.task;

    const res = await this._checkout.handlePatchCart();

    if (res.status) {
      switch (res.status) {
        case 403:
        case 429:
        case 430:
          this.shouldBanProxy = true;
          this._emitTaskEvent({
            message: 'Proxy banned, swapping...',
          });
          return States.SwapProxies;
        default:
          this._emitTaskEvent({
            message: `Error ${res.status} during ATC, retrying...`,
          });
          await waitForDelay(errorDelay);
          return States.PatchCart;
      }
    }

    if (res.errors) {
      this._logger.verbose('Patch cart error: %j', res.errors);
      if (res.errors === CheckoutErrorCodes.OOS || res.errors === CheckoutErrorCodes.ATC) {
        this._emitTaskEvent({
          message: 'Running for restocks',
        });
        await waitForDelay(monitorDelay);
        return States.PatchCart;
      }
      if (res.errors === CheckoutErrorCodes.MonitorForVariant) {
        this._emitTaskEvent({
          message: 'Waiting for product',
        });
        await waitForDelay(monitorDelay);
        return States.PatchCart;
      }
      if (res.errors === CheckoutErrorCodes.InvalidCheckoutSession) {
        this._emitTaskEvent({
          message: 'Invalid checkout session, rewinding...',
        });
        return States.CreateCheckout;
      }
      await waitForDelay(errorDelay);
      this._emitTaskEvent({
        message: 'Failed: Add to cart, stopping...',
      });
      return States.Stopped;
    }
    this._emitTaskEvent({
      message: 'Fetching shipping rates',
    });
    return States.ShippingRates;

    const { monitorDelay } = this._context.task;

    const res = await this._checkout.addToCart();

    if (res.status) {
      switch (res.status) {
        case 303: {
          this._emitTaskEvent({
            message: 'Waiting in queue',
          });
          return States.PollQueue;
        }
        case 403:
        case 429:
        case 430:
          // soft ban
          this.shouldBanProxy = true;
          this._emitTaskEvent({
            message: 'Swapping proxy',
          });
          return States.SwapProxies;
        default:
          // stop if not a soft ban
          this._emitTaskEvent({
            message: 'Error while adding to cart, stopping..',
          });
          return States.Stopped;
      }
    }

    if (res.errors) {
      if (res.errors === CheckoutErrorCodes.OOS) {
        this._emitTaskEvent({
          message: 'Running for restocks',
        });
        await waitForDelay(monitorDelay);
        return States.AddToCart;
      }
      if (res.errors === CheckoutErrorCodes.MonitorForVariant) {
        this._emitTaskEvent({
          message: 'Waiting for variant',
        });
        await waitForDelay(monitorDelay);
        return States.AddToCart;
      }
      if (res.errors === CheckoutErrorCodes.InvalidCheckoutSession) {
        this._emitTaskEvent({
          message: 'Creating checkout session',
        });
        return States.CreateCheckout;
      }
      this._emitTaskEvent({
        message: 'Failed: Adding to cart',
      });
      return States.Stopped;
    }
    this._emitTaskEvent({
      message: 'Fetching shipping rates',
    });
    return States.ShippingRates;
  }

  async _handleShippingRates() {
  async _handleShippingRates() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const { monitorDelay, errorDelay } = this._context.task;
    const res = await this._checkout.handleGetShippingRates();

    if (res.status) {
      switch (res.status) {
        case 403:
        case 429:
        case 430:
          this.shouldBanProxy = true;
          this._emitTaskEvent({
            message: 'Proxy banned, swapping...',
          });
          return States.SwapProxies;
        default:
          this._emitTaskEvent({
            message: `Error ${res.status} during shipping rates, retrying...`,
          });
          await waitForDelay(errorDelay);
          return States.ShippingRates;
      }
    }

    if (res.errors) {
      if (res.errors === CheckoutErrorCodes.ShippingRates) {
        this._emitTaskEvent({
          message: 'Polling for shipping rates',
        });
        await waitForDelay(monitorDelay);
        return States.ShippingRates;
      }
      this._emitTaskEvent({
        message: 'Failed: Fetching shipping rates, stopping...',
      });
      await waitForDelay(errorDelay);
      return States.Stopped;
    }
    this._emitTaskEvent({
      message: `Using shipping rate: ${res.rate}`,
    });
    return States.PaymentGateway;

    const { monitorDelay } = this._context.task;

    const res = await this._checkout.shippingRates();

    if (res.status) {
      switch (res.status) {
        case 303: {
          this._emitTaskEvent({
            message: 'Waiting in queue',
          });
          return States.PollQueue;
        }
        case 403:
        case 429:
        case 430:
          // soft ban
          this.shouldBanProxy = true;
          this._emitTaskEvent({
            message: 'Swapping proxy',
          });
          return States.SwapProxies;
        default:
          // stop if not a soft ban
          this._emitTaskEvent({
            message: 'Error while fetching shipping rates, stopping..',
          });
          return States.Stopped;
      }
    }

    if (res.errors) {
      if (res.errors === CheckoutErrorCodes.ShippingRates) {
        this._emitTaskEvent({
          message: 'Polling for shipping rates',
        });
        await waitForDelay(monitorDelay);
        return States.ShippingRates;
      }
      this._emitTaskEvent({
        message: 'Failed: Fetching shipping rates',
      });
      return States.Stopped;
    }
    this._emitTaskEvent({
      message: `Using shipping: ${res.rate}`,
    });
    return States.PaymentGateway;
  }

  async _handlePaymentGateway() {
  async _handleRequestCaptcha() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }
  }

  async _handleSubmitContact() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }
  }

  async _handlePaymentGateway() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const { monitorDelay, errorDelay } = this._context.task;
    const res = await this._checkout.handleGetPaymentGateway();

    if (res.status) {
      switch (res.status) {
        case 403:
        case 429:
        case 430:
          this.shouldBanProxy = true;
          this._emitTaskEvent({
            message: 'Proxy banned, swapping...',
          });
          return States.SwapProxies;
        default:
          this._emitTaskEvent({
            message: `Error ${res.status} during payment gateway, retrying...`,
          });
          await waitForDelay(errorDelay);
          return States.PaymentGateway;
      }
    }

    if (res.errors) {
      if (res.errors === CheckoutErrorCodes.InvalidGateway) {
        this._emitTaskEvent({
          message: 'Polling for payment gateway',
        });
        await waitForDelay(monitorDelay);
        return States.PaymentGateway;
      }
      this._emitTaskEvent({
        message: 'Failed: Fetching payment gateway, stopping...',
      });
      await waitForDelay(errorDelay);
      return States.Stopped;
    }
    this._emitTaskEvent({
      message: `Payment processing`,
    });
    return States.PostPayment;

    const { monitorDelay, errorDelay } = this._context.task;
    const res = await this._checkout.paymentGateway();

    if (res.status) {
      switch (res.status) {
        case 403:
        case 429:
        case 430:
          this.shouldBanProxy = true;
          this._emitTaskEvent({
            message: 'Proxy banned, swapping...',
          });
          return States.SwapProxies;
        default:
          this._emitTaskEvent({
            message: `Error ${res.status} during payment gateway, retrying...`,
          });
          await waitForDelay(errorDelay);
          return States.PaymentGateway;
      }
    }

    if (res.errors) {
      if (res.errors === CheckoutErrorCodes.Account) {
        this._emitTaskEvent({
          message: 'Logging in',
        });
        return States.Login;
      }
      if (res.errors === CheckoutErrorCodes.InvalidCaptchaToken) {
        this._emitTaskEvent({
          message: 'Waiting for captcha',
        });
        return States.Captcha;
      }
      if (res.errors === CheckoutErrorCodes.InvalidGateway) {
        this._emitTaskEvent({
          message: 'Polling for payment gateway',
        });
        await waitForDelay(monitorDelay);
        return States.PaymentGateway;
      }
      this._emitTaskEvent({
        message: 'Failed: Fetching payment gateway, stopping...',
      });
      await waitForDelay(errorDelay);
      return States.Stopped;
    }
    this._emitTaskEvent({
      message: `Payment processing`,
    });
    return States.PostPayment;
  }

  async _handleCaptcha() {
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const { errorDelay } = this._context.task;
    const { errors } = await this._checkout.handleRequestCaptcha();
    if (errors) {
      this._emitTaskEvent({
        message: 'Failed: Unable to get captcha token, stopping...',
      });
      await waitForDelay(errorDelay);
      return States.Stopped;
    }
    this._emitTaskEvent({ message: 'Submitting payment...' });
    return States.PostPayment;
  }

  async _handlePostPayment() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const { errorDelay } = this._context.task;
    const res = await this._checkout.handlePostPayment();

    if (res.status) {
      switch (res.status) {
        case 403:
        case 429:
        case 430:
          this.shouldBanProxy = true;
          this._emitTaskEvent({
            message: 'Proxy banned, swapping...',
          });
          return States.SwapProxies;
        default:
          this._emitTaskEvent({
            message: `Error ${res.status} during post payment, retrying...`,
          });
          await waitForDelay(errorDelay);
          return States.PostPayment;
      }
    }

    if (res.errors) {
      if (res.errors === CheckoutErrorCodes.InvalidCaptchaToken) {
        this._emitTaskEvent({
          message: 'Waiting for captcha',
        });
        return States.Captcha;
      }
      if (res.errors === CheckoutErrorCodes.Review) {
        this._emitTaskEvent({
          message: 'Payment processing',
        });
        return States.Review;
      }
    }
    this._emitTaskEvent({
      message: 'Payment Processing',
    });
    return States.Processing;

    const { errorDelay } = this._context.task;
    const res = await this._checkout.postPayment();

    if (res.status) {
      switch (res.status) {
        case 403:
        case 429:
        case 430:
          this.shouldBanProxy = true;
          this._emitTaskEvent({
            message: 'Proxy banned, swapping...',
          });
          return States.SwapProxies;
        default:
          this._emitTaskEvent({
            message: `Error ${res.status} during post payment, retrying...`,
          });
          await waitForDelay(errorDelay);
          this._emitTaskEvent({
            message: 'Posting payment',
          });
          return States.PostPayment;
      }
    }

    if (res.errors) {
      if (res.errors === CheckoutErrorCodes.InvalidCaptchaToken) {
        this._emitTaskEvent({
          message: 'Waiting for captcha',
        });
        return States.Captcha;
      }
      if (res.errors === CheckoutErrorCodes.Review) {
        this._emitTaskEvent({
          message: 'Payment processing',
        });
        return States.Review;
      }
    }
    this._emitTaskEvent({
      message: 'Payment processing',
    });
    return States.Processing;
  }

  async _handlePaymentReview() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }

    const { errorDelay } = this._context.task;
    const res = await this._checkout.handlePaymentReview();

    if (res.status) {
      switch (res.status) {
        case 403:
        case 429:
        case 430:
          this.shouldBanProxy = true;
          this._emitTaskEvent({
            message: 'Proxy banned, swapping...',
          });
          return States.SwapProxies;
        default:
          this._emitTaskEvent({
            message: `Error ${res.status} during post payment, retrying...`,
          });
          await waitForDelay(errorDelay);
          return States.PostPayment;
      }
    }

    if (res.errors) {
      if (res.errors === CheckoutErrorCodes.InvalidCaptchaToken) {
        this._emitTaskEvent({
          message: 'Waiting for captcha',
        });
        return States.Captcha;
      }
      if (res.errors === CheckoutErrorCodes.Review) {
        this._emitTaskEvent({
          message: 'Payment processing',
        });
        return States.Review;
      }
    }
    this._emitTaskEvent({
      message: 'Payment processing',
    });
    return States.Processing;

    const { errorDelay } = this._context.task;
    const res = await this._checkout.paymentReview();

    if (res.status) {
      switch (res.status) {
        case 403:
        case 429:
        case 430:
          this.shouldBanProxy = true;
          this._emitTaskEvent({
            message: 'Proxy banned, swapping...',
          });
          return States.SwapProxies;
        default:
          this._emitTaskEvent({
            message: `Error ${res.status} during post payment, retrying...`,
          });
          await waitForDelay(errorDelay);
          return States.PostPayment;
      }
    }

    if (res.errors) {
      if (res.errors === CheckoutErrorCodes.InvalidCaptchaToken) {
        this._emitTaskEvent({
          message: 'Waiting for captcha',
        });
        return States.RequestCaptcha;
      }
      if (res.errors === CheckoutErrorCodes.Review) {
        this._emitTaskEvent({
          message: 'Payment processing',
        });
        return States.PaymentReview;
      }
    }
    this._emitTaskEvent({
      message: 'Payment processing',
    });
    return States.PaymentProcess;
  }

  async _handlePaymentProcess() {
    // exit if abort is detected
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
      return States.Aborted;
    }
    this._context.timer.start(now());

    const { monitorDelay, errorDelay } = this._context.task;
    const res = await this._checkout.handleProcessing();

    if (res.status) {
      switch (res.status) {
        case 403:
        case 429:
        case 430:
          this.shouldBanProxy = true;
          this._emitTaskEvent({
            message: 'Proxy banned, swapping...',
          });
          return States.SwapProxies;
        default:
          this._emitTaskEvent({
            message: `Error ${res.status} during post payment, retrying...`,
          });
          await waitForDelay(errorDelay);
          return States.PostPayment;
      }
    const { monitorDelay, errorDelay } = this._context.task;
    const res = await this._checkout.paymentProcessing();

    if (res.status) {
      switch (res.status) {
        case 403:
        case 429:
        case 430:
          this.shouldBanProxy = true;
          this._emitTaskEvent({
            message: 'Proxy banned, swapping...',
          });
          return States.SwapProxies;
        default:
          this._emitTaskEvent({
            message: `Error ${res.status} during post payment, retrying...`,
          });
          await waitForDelay(errorDelay);
          return States.PostPayment;
      }
    }
    // Go back to previous state
    return this._prevState;
  }

  _generateEndStateHandler(state) {
    let status = 'stopped';
    switch (state) {
      case States.Aborted: {
        status = 'aborted';
        break;
      }
      case States.Errored: {
        status = 'errored out';
        break;
      }
      case States.Finished: {
        status = 'finished';
        break;
      }
      default: {
        break;
      }
    }
    return () => {
      this._emitTaskEvent({
        message: this._context.status || `Task has ${status}`,
      });
      return States.Stopped;
    };
  }

  async _handleShutdown() {
    return States.Stopped;
  }

  async _handleSwapProxies() {
    try {
      this._logger.verbose('Waiting for new proxy...');
      const proxy = await this.swapProxies();
      // Update the references
      this.proxy = proxy;
      this._context.proxy = proxy.proxy;
      this.shouldBanProxy = false; // reset ban flag
    } catch (err) {
      this._logger.verbose('Swap Proxies Handler completed with errors: %s', err, err);
      this._emitTaskEvent({
        message: 'Error Swapping Proxies! Retrying...',
        errors: err,
      });
      await this._waitForErrorDelay();
    }
    // Go back to previous state
    return this._prevState;
  }

  _generateEndStateHandler(state) {
    let status = 'stopped';
    switch (state) {
      case States.Aborted: {
        status = 'aborted';
        break;
      }
      case States.Errored: {
        status = 'errored out';
        break;
      }
      case States.Finished: {
        status = 'finished';
        break;
      }
      default: {
        break;
      }
    }
    return () => {
      this._emitTaskEvent({
        message: this._context.status || `Task has ${status}`,
      });
      return States.Stopped;
    };
  }

  async _handleStepLogic(currentState) {
    async function defaultHandler() {
      throw new Error('Reached Unknown State!');
    }

    this._logger.verbose('Handling state: %s', currentState);

    const stepMap = {
      [States.Started]: this._handleStarted,
      [States.TaskSetup]: this._handleTaskSetup,
      [States.Queue]: this._handleCheckoutQueue,
      [States.Login]: this._handleLogin,
      [States.PaymentToken]: this._handlePaymentToken,
      [States.CreateCheckout]: this._handleCreateCheckout,
      [States.PollQueue]: this._handlePollQueue,
      [States.Monitor]: this._handleMonitor,
      [States.AddToCart]: this._handleAddToCart,
      [States.ShippingRates]: this._handleShippingRates,
      [States.RequestCaptcha]: this._handleRequestCaptcha,
      [States.SubmitContact]: this._handleSubmitContact,
      [States.PaymentGateway]: this._handlePaymentGateway,
      [States.PostPayment]: this._handlePostPayment,
      [States.PaymentReview]: this._handlePaymentReview,
      [States.PaymentProcess]: this._handlePaymentProcess,
      [States.SwapProxies]: this._handleSwapProxies,
      [States.Finished]: this._generateEndStateHandler(States.Finished),
      [States.Errored]: this._generateEndStateHandler(States.Errored),
      [States.Aborted]: this._generateEndStateHandler(States.Aborted),
    };
    const handler = stepMap[currentState] || defaultHandler;
    return handler.call(this);
  }

  // MARK: State Machine Run Loop

  async start() {
    this._prevState = States.Started;
    this._state = States.Started;
    while (this._state !== States.Stopped) {
      let nextState = this._state;
      if (this._context.aborted) {
        nextState = States.Aborted;
      }
      try {
        // eslint-disable-next-line no-await-in-loop
        nextState = await this._handleStepLogic(this._state);
      } catch (e) {
        this._logger.debug('Run loop errored out! %s', e);
        nextState = States.Errored;
      }
      this._logger.verbose('Run Loop finished, state transitioned to: %s', nextState);
      // TODO: Prevent prevState from starting an infinite loop (prevState === state)
      this._prevState = this._state;
      this._state = nextState;
    }

    this._cleanup();
  }
}

TaskRunner.Events = Events;
TaskRunner.States = States;

module.exports = TaskRunner;
