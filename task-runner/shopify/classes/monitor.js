const { States } = require('../taskRunner');

class Monitor {
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
    _delay() {
        let delay = this._waitForRefreshDelay;
        switch (parsed.response.status) {
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
        return new Promise((resolve, reject) => {
            const productsRequest = {}; // Request for products.json // TODO Use parse to implement
            const atomRequest = {}; // Request for collections/all.atom // TODO use parse to implement
            const sitemapRequest = {}; // Request sitemap_products_1.xml // TODO use parse to implement
            
            // Store shared status object
            const status = {
                winner: null,
                errors: {
                    json: null,
                    atom: null,
                    xml: null,
                    count: 0,
                },
            };

            // Order the requests and attach .then handlers
            [
                {
                    request: productsRequest,
                    response: null,
                    type: 'json',
                },
                {
                    request: atomRequest,
                    response: null,
                    type: 'atom',
                },
                {
                    request: sitemapRequest,
                    response: null,
                    type: 'xml',
                },
            ].forEach((poll) => {
                poll.request.then(
                    (productInfo) => {
                        console.log(`[TRACE]: MONITOR: ${poll.type} - RESOLVE:\n${productInfo}`);
                        if (!status.winner) {
                            console.log(`[TRACE]: MONITOR: ${poll.type} - chosen as winner!`);
                            status.winner = productInfo;
                            poll.response = productInfo;
                            resolve(poll);
                        } else {
                            console.log(`[TRACE]: MONITOR: ${poll.type} - not chosen as winner!`);
                        }
                    },
                    (error) => {
                        console.log(`[TRACE]: MONITOR: ${poll.type} - REJECT:\n${error}`);
                        status.errors[poll.type] = error;
                        status.errors.count += 1;
                        if (status.errors.count >= 3) {
                            console.log(`[TRACE]: MONITOR: ${poll.type} - final error detected, rejecting...`);
                            reject(status.errors);
                        } else {
                            console.log(`[TRACE]: MONITOR: ${poll.type} - not the final error, there's still hope!`);
                        }
                    }
                );
            });
        });
    }

    async _verifyReadyForCheckout(product) {
        console.log(`[TRACE]: MONITOR: Starting verification for product...\nProduct Info:\n${product}`);
        // TODO: Implement!
        console.log(`[ERROR]: MONITOR: Verification has not been implmented, yet! Returning monitor...`);
        return this._delay();

        // Eventually, we will call this:
        // return States.Checkout;
    }

    async run() {
        if (this._context.aborted) {
            console.log('[INFO]: MONITOR: Abort detected, aborting...');
            return States.Aborted;
        }

        let parsed;
        try {
            // Try parsing all files and wait for the first response
            parsed = await this._parseAll();
        } catch (errors) {
            console.log(`[DEBUG]: MONITOR: All requests errored out!\n${errors}`);
            // consolidate statuses
            const statuses = errors.map(error => error.status);
            // Check for bans
            let banStatus;
            if (banStatus = statuses.find(s => s === 403 || s === 429)) {
                console.log(`[INFO]: MONITOR: Found a ban status: ${banStatus}, Swapping Proxies...`);
                return States.SwapProxies;
            }
        }
        

        console.log(`[DEBUG]: MONITOR: ${parsed.type} chosen as the winner`);

        // Check for ok status
        if (parsed.response.status < 400) {
            console.log(`[DEBUG]: MONITOR: Status is OK (${parsed.response.status}, verifying we are ready for checkout)`);
            return this._verifyReadyForCheckout(parsed.response);
        }
        // Status will be a delay status, check which one and wait the correct amount
        return this._delay();
    }
}

module.exports = Monitor;