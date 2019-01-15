const _ = require('underscore');
const { Parser, AtomParser, JsonParser, XmlParser, getSpecialParser } = require('./parsers');
const {
  formatProxy,
  userAgent,
  rfrl,
  capitalizeFirstLetter,
  waitForDelay,
  generateRandom,
} = require('./utils');
const { getAllSizes } = require('./utils/constants');
const { States } = require('./utils/constants').TaskRunner;
const { ErrorCodes } = require('./utils/constants');
const { ParseType, getParseType } = require('./utils/parse');
const { urlToTitleSegment, urlToVariantOption } = require('./utils/urlVariantMaps');

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
    this._logger.silly('Received status: %s', status || 404);
    let delay = this._waitForRefreshDelay;
    switch (status || 404) {
      case 401: {
        delay = this._waitForErrorDelay;
        break;
      }
      default:
        break;
    }
    await delay.call(this);
    this._logger.info('Monitoring not complete, remonitoring...');
    return { message: `Monitoring for product...`, nextState: States.Monitor };
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
    return rfrl(parsers, 'parseAll', this._context.logger);
  }

  _generateValidVariants(product) {
    const { sizes, site } = this._context.task;
    // Group variants by their size
    const variantsBySize = _.groupBy(
      product.variants,
      variant =>
        // Use the variant option or the title segment
        variant[urlToVariantOption[site.url]] || urlToTitleSegment[site.url](variant.title),
    );

    // Get the groups in the same order as the sizes
    const mappedVariants = sizes.map(size => {
      // if we're choosing a random size ..generate a random size for now for each respective category
      // TODO - implement a "stock checker" to choose the one with the most stock
      // (this will give our users a better chance of at least getting one)
      let idx = -1;
      switch (size) {
        case 'Random':
          idx = 0;
          break;
        case 'US Random':
          idx = 1;
          break;
        case 'UK Random':
          idx = 2;
          break;
        case 'EU Random':
          idx = 3;
          break;
        default:
          idx = -1;
          break;
      }
      if (idx !== -1) {
        let s;
        do {
          s = generateRandom(getAllSizes[idx]);
        } while (!variantsBySize[s]); // TODO - infinite loop if variants array is improper size
        return variantsBySize[s];
      }
      this._context.logger.verbose('MONITOR: variants for size: %j', variantsBySize);
      return (
        variantsBySize[size] ||
        variantsBySize[size.toLowerCase()] ||
        variantsBySize[size.toUpperCase()]
      );
    });
    this._context.logger.verbose('MONITOR: mapped variants: %j', mappedVariants);

    // Flatten the groups to a one-level array and remove null elements
    const validVariants = _.filter(_.flatten(mappedVariants, true), v => v);
    this._context.logger.verbose('MONITOR: valid variants: %j', validVariants);
    return validVariants.map(v => `${v.id}`);
  }

  async _monitorKeywords() {
    let parsed;
    try {
      // Try parsing all files and wait for the first response
      parsed = await this._parseAll();
    } catch (errors) {
      this._logger.debug('MONITOR: All request errored out! %j', errors);
      // consolidate statuses
      const statuses = errors.map(error => error.status);
      // Check for bans
      let checkStatus = statuses.find(s => s === 403 || s === 429 || s === 430);
      if (checkStatus) {
        this._logger.info('Proxy was Banned, swapping proxies...');
        return {
          message: 'Soft ban detected, attempting to swap proxies',
          shouldBan: true,
          nextState: States.SwapProxies,
        };
      }
      checkStatus = statuses.find(s => s >= 400);
      if (checkStatus) {
        return this._delay(checkStatus);
      }
    }
    this._logger.verbose('MONITOR: %s retrieved as a matched product', parsed.title);
    this._logger.verbose('MONITOR: Generating variant lists now...');
    const variants = this._generateValidVariants(parsed);
    this._logger.verbose('MONITOR: Variants Generated, updating context...');
    this._context.task.product.variants = variants;
    this._context.task.product.name = capitalizeFirstLetter(parsed.title);
    this._logger.verbose('MONITOR: Status is OK, proceeding to checkout');
    return {
      message: `Found product: ${this._context.task.product.name}`,
      nextState: this._context.setup ? States.PatchCart : States.TaskSetup,
    };
  }

  async _monitorUrl() {
    let { url } = this._context.task.product;
    // TODO - figure out a cleaner way to do this
    // eslint-disable-next-line prefer-destructuring
    url = url.split('?')[0];
    try {
      const response = await this._request({
        method: 'GET',
        uri: url,
        proxy: formatProxy(this._context.proxy),
        rejectUnauthorized: false,
        followAllRedirects: true,
        resolveWithFullResponse: true,
        simple: true,
        followRedirect: false,
        gzip: true,
        headers: {
          'User-Agent': userAgent,
        },
      });

      // Response Succeeded -- Get Product Info
      this._logger.verbose(
        'MONITOR: Url %s responded with status code %s. Getting full info',
        url,
        response.statusCode,
      );
      const fullProductInfo = await Parser.getFullProductInfo(url, this._request, this._logger);

      // Generate Variants
      this._logger.verbose(
        'MONITOR: Retrieve Full Product %s, Generating Variants List...',
        fullProductInfo.title,
      );
      const variants = this._generateValidVariants(fullProductInfo);
      this._logger.verbose('MONITOR: Variants Generated, updating context...');
      this._context.task.product.variants = variants;

      // Everything is setup -- kick it to checkout
      this._logger.verbose('MONITOR: Status is OK, proceeding to checkout');
      this._context.task.product.name = capitalizeFirstLetter(fullProductInfo.title);
      return {
        message: `Found product: ${this._context.task.product.name}`,
        nextState: this._context.setup ? States.PatchCart : States.TaskSetup,
      };
    } catch (error) {
      // Redirect, Not Found, or Unauthorized Detected -- Wait and keep monitoring...
      this._logger.debug(
        'MONITOR Monitoring Url %s responded with status code %s. Delaying and Retrying...',
        url,
        error.statusCode,
      );
      return this._delay(error.statusCode);
    }
  }

  async _monitorSpecial() {
    // Get the correct special parser
    const ParserCreator = getSpecialParser(this._context.task.site);
    const parser = ParserCreator(
      this._context.request,
      this._context.task,
      this._context.proxy,
      this._context.logger,
    );

    let parsed;
    try {
      parsed = await parser.run();
    } catch (error) {
      this._logger.debug('MONITOR: Error with special parsing!', error);
      // Check for a product not found error
      if (error.status === ErrorCodes.Parser.ProductNotFound) {
        return { message: 'Error: Product Not Found!', nextState: States.Errored };
      }
      return this._delay(error.status);
    }
    this._logger.verbose('MONITOR: %s retrieved as a matched product', parsed.title);
    this._logger.verbose('MONITOR: Generating variant lists now...');
    const variants = this._generateValidVariants(parsed);
    this._logger.verbose('MONITOR: Variants Generated, updating context...');
    this._context.task.product.variants = variants;
    this._context.task.product.name = capitalizeFirstLetter(parsed.title);
    this._logger.verbose('MONITOR: Status is OK, proceeding to checkout');
    return {
      message: `Found product: ${this._context.task.product.name}`,
      nextState: States.PatchCart,
    };
  }

  async run() {
    if (this._context.aborted) {
      this._logger.info('Abort Detected, Stopping...');
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
        this._logger.verbose('MONITOR: Variant Parsing Detected');
        this._context.task.product.variants = [this._context.task.product.variant];
        this._logger.verbose('MONITOR: Skipping Monitor and Going to Checkout Directly...');
        result = { message: 'Adding to cart', nextState: States.PatchCart };
        break;
      }
      case ParseType.Url: {
        this._logger.verbose('MONITOR: Url Parsing Detected');
        result = await this._monitorUrl();
        break;
      }
      case ParseType.Keywords: {
        this._logger.verbose('MONITOR: Keyword Parsing Detected');
        result = await this._monitorKeywords();
        break;
      }
      case ParseType.Special: {
        this._logger.verbose('MONITOR: Special Parsing Detected');
        result = await this._monitorSpecial();
        break;
      }
      default: {
        this._logger.verbose(
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
