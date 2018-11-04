const { States } = require('../taskRunner');
const { AtomParser, JsonParser, XmlParser } = require('./parsers');
const { rfrl } = require('./utils/rfrl');
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
    }

    _waitForDelay(delay) {
        console.log('[TRACE]: MONITOR: Waiting for ${delay} ms...');
        return new Promise(resolve => setTimeout(resolve, delay));
    };

    _waitForRefreshDelay() {
        console.log('[DEBUG]: MONITOR: Waiting for monitor delay...');
        return this._waitForDelay(this._task.monitorDelay);
    }

    _waitForErrorDelay() {
        console.log('[DEBUG]: MONITOR: Waiting for error delay...');
        return this._waitForDelay(this._task.errorDelay);
    }

    // ASSUMPTION: this method is only called when we know we have to 
    // delay and start the monitor again...
    _delay(status) {
        let delay = this._waitForRefreshDelay;
        switch (status) {
            case 401:
            case 404: {

                delay = this._waitForErrorDelay;
                break;
            }
            default: break;
        }
        await delay();
        console.log('[INFO]: MONITOR: Returning Monitor Again State...');
        return States.Monitor;
    }

    _parseAll() {
        // Create the parsers and start the async run methods
        const parsers = [
            new AtomParser(this._context.task, this._context.proxy),
            new JsonParser(this._context.task, this._context.proxy),
            new XmlParser(this._context.task, this._context.proxy),
        ].map(p => p.run());
        // Return the winner of the race
        return rfrl(parsers);
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
        return validVariants;
    }

    async run() {
        if (this._context.aborted) {
            console.log('[INFO]: MONITOR: Abort detected, aborting...');
            return States.Aborted;
        }

        // TODO: Check the parsing type before running parseAll

        let parsed;
        try {
            // Try parsing all files and wait for the first response
            parsed = await this._parseAll();
        } catch (errors) {
            console.log(`[DEBUG]: MONITOR: All requests errored out!\n${errors}`);
            // consolidate statuses
            const statuses = errors.map(error => error.status);
            // Check for bans
            let checkStatus;
            if (checkStatus = statuses.find(s => s === 403 || s === 429)) {
                console.log(`[INFO]: MONITOR: Found a ban status: ${checkStatus}, Swapping Proxies...`);
                return States.SwapProxies;
            } else if (checkStatus = statuses.find(s => s >= 400)) {
                return this._delay(checkStatus);
            }
        }
        console.log(`[DEBUG]: MONITOR: ${parsed} retrived as a matched product`);
        console.log('[DEBUG]: MONITOR: Generating variant lists now...')
        const variants = this._generateValidVariants(parsed);
        console.log('[DEBUG]: MONITOR: Variants Generated, updating context...');
        this._context.task.product.variants = variants;
        console.log('[DEBUG]: MONITOR: Status is OK, proceeding to checkout');
        return States.Checkout;
    }
}

module.exports = Monitor;
