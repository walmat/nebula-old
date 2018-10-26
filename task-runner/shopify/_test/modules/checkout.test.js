const task = require('./task.test');
const CheckoutModule = require('../../classes/checkout');

const context = {
    runner_id: 1,
    task: task,
    proxy: null,
    aborted: false,
}

const Checkout = new CheckoutModule(context);

Checkout.run();