const _ = require('underscore');
const jar = require('request-promise').jar();
const rp = require('request-promise').defaults({
    timeout: 10000,
    jar: jar,
});

const { AtomParser, JsonParser, XmlParser } = require('./parsers');
const { formatProxy, userAgent, rfrl, capitalizeFirstLetter, waitForDelay } = require('./utils');
const { States } = require('./utils/constants').TaskRunner;
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
        switch (status || 404) {
            case 401:
            case 404: {
                delay = this._waitForErrorDelay;
                break;
            }
            default: break;
        }
        await delay.call(this);
        this._logger.info('Monitoring not complete, remonitoring...');
        return { message: `Delaying ${delay}`, nextState: States.Monitor };
    }

    _parseAll() {
        // Create the parsers and start the async run methods
        const parsers = [
            new AtomParser(this._context.task, this._context.proxy, this._context.logger),
            new JsonParser(this._context.task, this._context.proxy, this._context.logger),
            new XmlParser(this._context.task, this._context.proxy, this._context.logger),
        ].map(p => p.run());
        // Return the winner of the race
        return rfrl(parsers, 'parseAll', this._context.logger);
    }

    _generateValidVariants(product) {
        const { sizes, site } = this._context.task;
        // Group variants by their size
        const variantsBySize = _.groupBy(product.variants, (variant) => {
            // Use the variant option or the title segment
            return variant[urlToVariantOption[site.url]] || urlToTitleSegment[site.url](variant.title);
        });
        // Get the groups in the same order as the sizes
        const mappedVariants = sizes.map((size) => {
            return variantsBySize[size];
        });
        // Flatten the groups to a one-level array and remove null elements
        const validVariants = _.filter(
            _.flatten(mappedVariants, true),
            v => v
        );
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
            let checkStatus;
            if (checkStatus = statuses.find(s => s === 403 || s === 429)) {
                this._logger.info('Proxy was Banned, swapping proxies...');
                return { message: 'Soft ban detected, attempting to swap proxies', nextState: States.SwapProxies };
            } else if (checkStatus = statuses.find(s => s >= 400)) {
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
        return { message: `Found product: ${this._context.task.product.name}`, nextState: States.Checkout };
        }

    async _monitorUrl() {
        const { url } = this._context.task.product;
        try {
            const response = await rp({
                method: 'GET',
                uri: url,
                proxy: formatProxy(this._context.proxy),
                resolveWithFullResponse: true,
                simple: true,
                followRedirect: false,
                gzip: true,
                headers: {
                    'User-Agent': userAgent,
                },
            });
            // Response Succeeded -- Get Product Info
            this._logger.verbose('MONITOR: Url %s responded with status code %s. Getting full info', url, response.statusCode);
            const fullProductInfo = await JsonParser.getFullProductInfo(url, this._logger);

            // Generate Variants
            this._logger.verbose('MONITOR: Retrieve Full Product %s, Generating Variants List...', fullProductInfo.title);
            const variants = this._generateValidVariants(fullProductInfo);
            this._logger.verbose('MONITOR: Variants Generated, updating context...');
            this._context.task.product.variants = variants;

            // Everything is setup -- kick it to checkout
            this._logger.verbose('MONITOR: Status is OK, proceeding to checkout');
            this._context.task.product.name = capitalizeFirstLetter(fullProductInfo.title);
            return { message: `Found product: ${this._context.task.product.name}`, nextState: States.Checkout };
        } catch (error) {
            // Redirect, Not Found, or Unauthorized Detected -- Wait and keep monitoring...
            this._logger.debug('MONITOR Monitoring Url %s responded with status code %s. Delaying and Retrying...', url, error.statusCode);
            return this._delay(error.statusCode);
        }
    }

    async run() {
        if (this._context.aborted) {
            this._logger.info('Abort Detected, Stopping...');
            return { nextState: States.Aborted };
        }

        const parseType = getParseType(this._context.task.product, this._logger);
        switch(parseType) {
            case ParseType.Variant: {
                // TODO: Add a way to determine if variant is correct
                this._logger.verbose('MONITOR: Variant Parsing Detected');
                this._context.task.product.variants = [this._context.task.product.variant];
                this._logger.verbose('MONITOR: Skipping Monitor and Going to Checkout Directly...');
                return { message: 'Adding to cart', nextState: States.Checkout };
            }
            case ParseType.Url: {
                this._logger.verbose('MONITOR: Url Parsing Detected');
                return this._monitorUrl();
            }
            case ParseType.Keywords: {
                this._logger.verbose('MONITOR: Keyword Parsing Detected');
                return this._monitorKeywords();;
            }
            default: {
                this._logger.verbose('MONITOR: Unable to Monitor Type: %s -- Delaying and Retrying...', parseType);
                await this._waitForErrorDelay();
                return { message: 'Monitoring...', nextState: States.Monitor };
            }
        }
    }
}

module.exports = Monitor;
