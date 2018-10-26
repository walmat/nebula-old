const { States } = require('../taskRunner').States;
const jar = require('request-promise').jar();
const rp = require('request-promise').defaults({
    timeout: 10000,
    jar: jar,
});

const {
    formatProxy,
    userAgent,
} = require('./utils');

class AddToCart {

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

        /**
         * destructuring to help save me some typing...
         */
        this._task = this._context.task;
        this._runnerID = this._context.runner_id;
        this._proxy = this._context.proxy;
        this._aborted = this._context.aborted;

    }

    addToCart() {
        if (this._aborted) {
            console.log('[INFO]: CHECKOUT: Abort detected, aborting...');
            return States.Aborted;
        }

        return rp({
            uri: `${this._task.site.url}/cart/add.js`,
            followAllRedirects: true,
            proxy: formatProxy(this._proxy),
            method: 'post',
            headers: {
                Origin: this._task.site.url,
                'User-Agent': userAgent,
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept:
                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                Referer: this._task.product.url,
                'Accept-Language': 'en-US,en;q=0.8',
            },
            formData: {
                id: this._task.product.variant,
                qty: '1',
            },
        })
        .then((res) => {
            console.log(res);
            // check response
            console.log('[INFO]: CHECKOUT: Checking if add to cart was valid...');
            return res.status !== 404;
        })
        .catch((err) => {
            console.log('[ERROR]: CHECKOUT: Unable to submit add to cart request...');
            // TODO - error handling
            return false;
        });
    }
}
module.exports = AddToCart;