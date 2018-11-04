const task = require('./task.test');
const Cart = require('../../classes/cart');
const Checkout = require('../../classes/checkout');
const Account = require('../../classes/account');

const context = {
    runner_id: 1,
    task: task,
    // proxy: null,
    proxy: `127.0.0.1:8888`,
    aborted: false,
}

/**
 * Account tests
 */
const a = new Account(context);

testAccount = async () => {
    a.login();
    a.logout();
}

testAccount();

/**
 * End Account tests
 */

/**
 * Cart tests
 */
const cart = new Cart(context);

testCart = async () => {
    let added = await cart.addToCart();
    console.log('Added status: ' + added);
    const checkout = await cart.proceedToCheckout();
    console.log('Checkout status: ' + checkout);
    added = await cart.addToCart();
    console.log('Added status: ' + added);
    const rates = await cart.getEstimatedShippingRates();
    console.log('Rates status: ' + rates);
    const cleared = await cart.clearCart();
    console.log('Cleared status: ' + cleared);
}
testCart();
/**
 * End Cart tests
 */



// const c = new Checkout(context);

// Checkout.run();