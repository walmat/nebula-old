const {
    formatProxy,
    userAgent,
    request
} = require('./utils');
const Cart = require('./cart');
const Checkout = require('./checkout');

/**
 * Class to generate an alternative checkout link 5-10 minutes before
 * the drop time. Will be called immediately after the task starts
 */
class Bypass {
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

        this._cart = new Cart(context);
        this._checkout = new Checkout(context);

        this._task = context.task;
        this._id = context.runner_id;
        this._proxy = context.proxy;
        this._aborted = context.aborted;
        this._logger = context.logger;
    }

    generateAlternativeCheckout() {
        
    }
}

module.exports = Bypass;