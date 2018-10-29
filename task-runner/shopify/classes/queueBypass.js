const jar = require('request-promise').jar();
const autoParse = require('./utils');
const rp = require('request-promise').defaults({
    transform: autoParse,
    timeout: 10000,
    jar: jar,
});
const { States } = require('../taskRunner');
const Cart = require('./cart');

class QueueBypass {
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

        this.retries = {
            GET_PROODUCT_DATA: 5,
        }

        this._cart = new Cart(context);
        this._monitor = new Monitor(context);

        this._task = context.task;
        this._id = context.runner_id;
        this._proxy = context.proxy;
        this._aborted = context.aborted;
    }

    _findInStockProduct() {
        // attempt to find in stock product, add it to cart, generate checkout url
        // store checkout URL in task object somehow
    }

    async run() {
        // exit early if the user stops the task
        if (this._context.aborted) {
            console.log('[INFO]: MONITOR: Abort detected, aborting...');
            return States.Aborted;
        }
        // get the parsed site data
        let productInfo = null;
        while (this.retries.GET_PROODUCT_DATA > 0) {
            try {
                productInfo = await this._monitor._parseAll();
                if (productInfo) {
                    break;
                } else {
                    this.retries.GET_PROODUCT_DATA--;
                }
            } catch (err) {
                console.log(`[ERROR]: Unable to parse website.. trying ${this.retries.GET_PROODUCT_DATA} more times.`)
                this.retries.GET_PROODUCT_DATA--;
            }
        }
        if (!productInfo) {
            // this might happen if password page is up or something..?
            console.log(`[ERROR]: Unable to generate successful queue bypass.`)
            return States.Checkout;
        }
        let queueBypassData = null;
        try {
            queueBypassData = await this._findInStockProduct();
        } catch (err) {
            // this might happen if password page is up or something..?
            console.log(`[ERROR]: Unable to find in stock product.. continuing to monitor!`)
        }
        if (queueBypassData) {
            return queueBypassData;
        } else {
            return null;
        }
    }
}

module.exports = QueueBypass;