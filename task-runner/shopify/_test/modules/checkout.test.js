const task = require('./task.test');
const Account = require('../../classes/account');
const Cart = require('../../classes/cart');
const Shipping = require('../../classes/shipping');
const Payment = require('../../classes/payment');
const Checkout = require('../../classes/checkout');
const Timer = require('../../classes/timer');


const context = {
    runner_id: 1,
    task: task,
    proxy: null,
    // proxy: `127.0.0.1:8888`,
    aborted: false,
}

/**
 * Account tests
 */
const a = new Account(context);

testAccount = async () => {
    const loggedIn = await a.login();
    console.log(`Logged in: ${loggedIn}`);
    const loggedOut = await a.logout();
    console.log(`Logged out: ${loggedOut}`);

}
// testAccount();
/**
 * End Account tests
 */



/**
 * Cart tests
 */
const cart = new Cart(context, new Timer());
let checkout;

testCart = async () => {
    let added = await cart.addToCart();
    console.log('Added status: ' + added);
    checkout = await cart.proceedToCheckout();
    console.log('Checkout status: ' + checkout);
    added = await cart.addToCart();
    console.log('Added status: ' + added);
    const rates = await cart.getEstimatedShippingRates();
    console.log('Rates status: ' + rates);
    const cleared = await cart.clearCart();
    console.log('Cleared status: ' + cleared);
}
// testCart();
/**
 * End Cart tests
 */



/**
 * Shipping tests
 */

testShipping = async () => {
    let added = await cart.addToCart();
    console.log('Added status: ' + added);
    const checkout = await cart.proceedToCheckout();
    const shipping = new Shipping(
        context,
        new Timer(),
        checkout.checkoutHost,
        checkout.checkoutUrl,
        checkout.checkoutId,
        checkout.storeId,
        checkout.authToken,
        checkout.price,
    );

    let authToken = await shipping.submit();

    console.log('Old authentication token: ' + checkout.authToken);
    console.log('New Authentication token: ' + authToken);
}
// testShipping();
/**
 * End Shipping tests
 */


/**
 * Payment tests
 */

testPayment = async () => {
    let added = await cart.addToCart();
    console.log('Added status: ' + added);
    const checkout = await cart.proceedToCheckout();

    const shipping = new Shipping(
        context,
        new Timer(),
        checkout.checkoutHost,
        checkout.checkoutUrl,
        checkout.checkoutId,
        checkout.storeId,
        checkout.authToken,
        checkout.price,
    );

    let authToken = await shipping.submit();

    const payment = new Payment(
        context,
        new Timer(),
        checkout.checkoutHost,
        checkout.checkoutUrl,
        checkout.checkoutId,
        checkout.storeId,
        authToken,
        checkout.price,
    );

    let state = await payment.submit();

    console.log('Payment state: ' + state);
}
// testPayment();
/**
 * End Payment tests
 */


/**
 * Full Checkout test
 */

testCheckout = async (context) => {
    let checkout = new Checkout(context);
    checkout.run();
}
testCheckout(context);
/**
 * End Checkout tests
 */