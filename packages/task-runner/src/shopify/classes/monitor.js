const { Parser, AtomParser, JsonParser, XmlParser, getSpecialParser } = require('./parsers');
const { formatProxy, userAgent, rfrl, capitalizeFirstLetter, waitForDelay } = require('./utils');
const { Types, States } = require('./utils/constants').TaskRunner;
const { ErrorCodes } = require('./utils/constants');
const { ParseType, getParseType } = require('./utils/parse');
const generateVariants = require('./utils/generateVariants');

class Monitor {
  constructor(context) {
    /**
     * All data needed for monitor to run
     * This includes:
     * - runner_id: current runner id
     * - task: current task
     * - proxy: current proxy
     * - aborted: whether or not we should abort
     * @type {TaskRunnerContext}
     */
    this._context = context;
    this._logger = this._context.logger;
    this._request = this._context.request;
    this._parseType = null;
  }

  _waitForRefreshDelay() {
    this._logger.silly('MONITOR: Waiting for %d ms...', this._context.task.monitorDelay);
    return waitForDelay(this._context.task.monitorDelay);
  }

  _waitForErrorDelay() {
    this._logger.silly('MONITOR: Waiting for %d ms...', this._context.task.errorDelay);
    return waitForDelay(this._context.task.errorDelay);
  }

  // ASSUMPTION: this method is only called when we know we have to
  // delay and start the monitor again...
  async _delay(status) {
    let delay = this._waitForRefreshDelay;
    let message = 'Monitoring for product';
    switch (status || 404) {
      case 401: {
        delay = this._waitForErrorDelay;
        break;
      }
      case 601: {
        message = 'Password page';
        break;
      }
      default:
        break;
    }
    await delay.call(this);
    this._logger.silly('Monitoring not complete, remonitoring...');
    return { message, nextState: States.Monitor };
  }

  async _handleParsingErrors(errors) {
    let delayStatus;
    let ban = true; // assume we have a softban
    let hardBan = false; // assume we don't have a hardban
    errors.forEach(({ status }) => {
      if (status === 403) {
        // ban is a strict hardban, so set the flag
        hardBan = true;
      } else if (status !== 429 && status !== 430) {
        // status is neither 403, 429, 430, so set ban to false
        ban = false;
      }
      if (!delayStatus && (status === ErrorCodes.ProductNotFound || status >= 400)) {
        delayStatus = status; // find the first error that is either a product not found or 4xx response
      }
    });
    if (ban || hardBan) {
      this._logger.silly('Proxy was banned, swapping proxies...');
      // we can assume that it's a soft ban by default since it's either ban || hardBan
      const shouldBan = hardBan ? 2 : 1;
      return {
        message: 'Swapping proxy',
        shouldBan,
        nextState: States.SwapProxies,
      };
    }
    return this._delay(delayStatus || 404);
  }

  _parseAll() {
    // Create the parsers and start the async run methods
    const parsers = [
      new AtomParser(
        this._context.request,
        this._context.task,
        this._context.proxy,
        this._context.logger,
      ),
      new JsonParser(
        this._context.request,
        this._context.task,
        this._context.proxy,
        this._context.logger,
      ),
      new XmlParser(
        this._context.request,
        this._context.task,
        this._context.proxy,
        this._context.logger,
      ),
    ].map(p => p.run());
    // Return the winner of the race
    return rfrl(parsers, 'parseAll');
  }

  _generateVariants(product) {
    const { sizes, site } = this._context.task;
    let variants;
    let chosenSizes;
    try {
      ({ variants, sizes: chosenSizes } = generateVariants(product, sizes, site, this._logger));
    } catch (err) {
      if (err.code === ErrorCodes.VariantsNotMatched) {
        return {
          message: 'Unable to match variants',
          nextState: States.Stopped,
        };
      }
      if (err.code === ErrorCodes.VariantsNotAvailable && this._parseType === ParseType.Special) {
        return {
          message: 'Running for restocks',
          nextState: States.Monitor,
        };
      }
      if (err.code === ErrorCodes.VariantsNotAvailable) {
        return {
          message: 'Running for restocks',
          nextState: States.Restocking,
        };
      }
      this._logger.error('MONITOR: Unknown error generating variants: %s', err.message, err.stack);
      return {
        message: 'Task has errored out!',
        nextState: States.Errored,
      };
    }
    return { variants, sizes: chosenSizes };
  }

  async _monitorKeywords() {
    let parsed;
    try {
      // Try parsing all files and wait for the first response
      parsed = await this._parseAll();
    } catch (errors) {
      this._logger.silly('MONITOR: All request errored out! %j', errors);
      // handle parsing errors
      if (this._context.type === Types.ShippingRates) {
        return { message: 'Product not found!', nextState: States.Errored };
      }
      return this._handleParsingErrors(errors);
    }
    this._logger.silly('MONITOR: %s retrieved as a matched product', parsed.title);
    this._logger.silly('MONITOR: Generating variant lists now...');
    this._context.task.product.restockUrl = parsed.url; // Store restock url in case all variants are out of stock
    this._context.task.product.name = capitalizeFirstLetter(parsed.title);
    const { site } = this._context.task;
    const { variants, sizes, nextState, message } = this._generateVariants(parsed);
    // check for next state (means we hit an error when generating variants)
    if (nextState) {
      return { nextState, message };
    }
    this._logger.silly('MONITOR: Variants Generated, updating context...');
    this._context.task.product.variants = variants;
    this._context.task.product.chosenSizes = sizes;
    this._context.task.product.url = `${site.url}/products/${parsed.handle}`;
    this._logger.silly('MONITOR: Status is OK, proceeding to checkout');
    return {
      message: `Found product: ${this._context.task.product.name}`,
      nextState: States.AddToCart,
    };
  }

  async _monitorUrl() {
    const [url] = this._context.task.product.url.split('?');
    try {
      const response = await this._request({
        method: 'GET',
        uri: url,
        proxy: formatProxy(this._context.proxy),
        rejectUnauthorized: false,
        followAllRedirects: true,
        resolveWithFullResponse: true,
        simple: true,
        gzip: true,
        headers: {
          'User-Agent': userAgent,
        },
      });

      // Response Succeeded -- Get Product Info
      this._logger.silly(
        'MONITOR: Url %s responded with status code %s. Getting full info',
        url,
        response.statusCode,
      );
      let fullProductInfo;
      try {
        // Try getting full product info
        fullProductInfo = await Parser.getFullProductInfo(
          url,
          this._context.proxy,
          this._request,
          this._logger,
        );
      } catch (errors) {
        this._logger.error('MONITOR: All request errored out! %j', errors);
        if (this._context.type === Types.ShippingRates) {
          return { message: 'Product not found!', nextState: States.Errored };
        }
        // handle parsing errors
        return this._handleParsingErrors(errors);
      }
      // Generate Variants
      this._logger.silly(
        'MONITOR: Retrieve Full Product %s, Generating Variants List...',
        fullProductInfo.title,
      );
      this._context.task.product.restockUrl = url; // Store restock url in case all variants are out of stock
      const { variants, sizes, nextState, message } = this._generateVariants(fullProductInfo);
      // check for next state (means we hit an error when generating variants)
      if (nextState) {
        return { nextState, message };
      }
      this._logger.silly('MONITOR: Variants Generated, updating context...');
      this._context.task.product.variants = variants;
      this._context.task.product.chosenSizes = sizes;

      // Everything is setup -- kick it to checkout
      this._logger.silly('MONITOR: Status is OK, proceeding to checkout');
      this._context.task.product.name = capitalizeFirstLetter(fullProductInfo.title);
      return {
        message: `Found product: ${this._context.task.product.name}`,
        nextState: States.AddToCart,
      };
    } catch (error) {
      // Redirect, Not Found, or Unauthorized Detected -- Wait and keep monitoring...
      this._logger.error(
        'MONITOR Monitoring Url %s responded with status code %s. Delaying and Retrying...',
        url,
        error.statusCode,
      );
      return this._delay(error.statusCode);
    }
  }

  async _monitorSpecial() {
    const { task, request, proxy, logger } = this._context;
    const { product, site } = task;
    // Get the correct special parser
    const ParserCreator = getSpecialParser(site);
    const parser = ParserCreator(request, task, proxy, logger);

    let parsed;
    try {
      parsed = await parser.run();
    } catch (error) {
      this._logger.error(
        'MONITOR: %d Error with special parsing! %j %j',
        error.status,
        error.message,
        error.stack,
      );
      // Check for a product not found error
      if (error.status === ErrorCodes.ProductNotFound) {
        return { message: 'Error: Product Not Found!', nextState: States.Errored };
      }
      return this._handleParsingErrors([error]);
    }
    this._logger.silly('MONITOR: %s retrieved as a matched product', parsed.title);
    this._logger.silly('MONITOR: Generating variant lists now...');
    this._context.task.product.restockUrl = parsed.url; // Store restock url in case all variants are out of stock
    let variants;
    let sizes;
    let nextState;
    let message;
    if (product.variant) {
      variants = [product.variant];
    } else {
      ({ variants, sizes, nextState, message } = this._generateVariants(parsed));
      // check for next state (means we hit an error when generating variants)
      if (nextState) {
        return { nextState, message };
      }
    }
    this._logger.silly('MONITOR: Variants Generated, updating context...');
    this._context.task.product.variants = variants;
    this._context.task.product.chosenSizes = sizes;
    this._context.task.product.name = capitalizeFirstLetter(parsed.title);
    this._logger.silly('MONITOR: Status is OK, proceeding to checkout');
    return {
      message: `Found product: ${this._context.task.product.name}`,
      nextState: States.AddToCart,
    };
  }

  async run() {
    if (this._context.aborted) {
      this._logger.silly('Abort Detected, Stopping...');
      return { nextState: States.Aborted };
    }

    this._parseType = getParseType(
      this._context.task.product,
      this._logger,
      this._context.task.site,
    );

    let result;
    switch (this._parseType) {
      case ParseType.Variant: {
        // TODO: Add a way to determine if variant is correct
        this._logger.silly('MONITOR: Variant Parsing Detected');
        this._context.task.product.variants = [this._context.task.product.variant];
        result = { message: 'Adding to cart', nextState: States.AddToCart };
        break;
      }
      case ParseType.Url: {
        this._logger.silly('MONITOR: Url Parsing Detected');
        result = await this._monitorUrl();
        break;
      }
      case ParseType.Keywords: {
        this._logger.silly('MONITOR: Keyword Parsing Detected');
        result = await this._monitorKeywords();
        break;
      }
      case ParseType.Special: {
        this._logger.silly('MONITOR: Special Parsing Detected');
        result = await this._monitorSpecial();
        break;
      }
      default: {
        this._logger.error(
          'MONITOR: Unable to Monitor Type: %s -- Delaying and Retrying...',
          this._parseType,
        );
        return { message: 'Invalid Product Input given!', nextState: States.Errored };
      }
    }
    // If the next state is an error, use the message as the ending status
    if (result.nextState === States.Errored) {
      this._context.status = result.message;
    }
    return result;
  }
}

module.exports = Monitor;
