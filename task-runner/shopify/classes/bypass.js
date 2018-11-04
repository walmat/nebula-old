const jar = require('request-promise').jar();
const autoParse = require('./utils');
const rp = require('request-promise').defaults({
    transform: autoParse,
    timeout: 10000,
    jar: jar,
});
const Cart = require('./cart');

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

        this._task = context.task;
        this._id = context.runner_id;
        this._proxy = context.proxy;
        this._aborted = context.aborted;
    }

    createAlternativeCheckout() {
        this._cart.addToCart();
    }
    

}

module.exports = Bypass;