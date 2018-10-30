const { States } = require('../taskRunner');
const { AtomParser, JsonParser, XmlParser } = require('./parsers');
const { rfrl } = 

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
        // Create the parsers and start the async run methods
        const parsers = [
            new AtomParser(this._context.task, this._context.proxy),
            new JsonParser(this._context.task, this._context.proxy),
            new XmlParser(this._context.task, this._context.proxy),
        ].map(p => p.run());
        // Return the winner of the race
        return rfrl(parsers);
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
            let banStatus;
            if (banStatus = statuses.find(s => s === 403 || s === 429)) {
                console.log(`[INFO]: MONITOR: Found a ban status: ${banStatus}, Swapping Proxies...`);
                return States.SwapProxies;
            }
        }
        console.log(`[DEBUG]: MONITOR: ${parsed} chosen as the winner`);

        // Check for ok status
        if (parsed.status < 400) {
            console.log(`[DEBUG]: MONITOR: Status is OK (${parsed.status} proceeding to checkout`);
            return this._verifyReadyForCheckout(parsed.response);
        }
        // Status will be a delay status, check which one and wait the correct amount
        return this._delay();
    }
}

module.exports = Monitor;