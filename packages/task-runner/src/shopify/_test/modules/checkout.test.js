/* eslint-disable no-console, no-unused-vars */
const task = require('./task.test');
const Account = require('../../classes/account');
const Cart = require('../../classes/old/cart');
const Shipping = require('../../classes/old/shipping');
const Payment = require('../../classes/old/payment');
const Checkout = require('../../classes/checkout');
const Timer = require('../../classes/timer');

const context = {
  runner_id: 1,
  task,
  proxy: null,
  // proxy: `127.0.0.1:8888`,
  aborted: false,
};

/**
 * Account test
 */
const account = new Account(context);

const testAccount = async () => {
  const loggedIn = await account.login();
  console.log(`Logged in: ${loggedIn}`);
  const loggedOut = await account.logout();
  console.log(`Logged out: ${loggedOut}`);
};
// testAccount();
/**
 * End Account test
 */

/**
 * Cart test
 */
const cart = new Cart(context, new Timer());

const testCart = async () => {
  let added = await cart.addToCart();
  console.log(`Added status: ${added}`);
  const checkout = await cart.proceedToCheckout();
  console.log(`Checkout status: ${checkout}`);
  added = await cart.addToCart();
  console.log(`Added status: ${added}`);
  const rates = await cart.getEstimatedShippingRates();
  console.log(`Rates status: ${rates}`);
  const cleared = await cart.clearCart();
  console.log(`Cleared status: ${cleared}`);
};
// testCart();
/**
 * End Cart test
 */

/**
 * Shipping test
 */

const testShipping = async () => {
  const added = await cart.addToCart();
  console.log(`Added status: ${added}`);
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

  const authToken = await shipping.submit();

  console.log(`Old authentication token: ${checkout.authToken}`);
  console.log(`New Authentication token: ${authToken}`);
};
// testShipping();
/**
 * End Shipping test
 */

/**
 * Payment test
 */

const testPayment = async () => {
  const added = await cart.addToCart();
  console.log(`Added status: ${added}`);
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

  const authToken = await shipping.submit();

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

  const state = await payment.submit();

  console.log(`Payment state: ${state}`);
};
// testPayment();
/**
 * End Payment test
 */

/**
 * Full Checkout test
 */

const testCheckout = async ctx => {
  const checkout = new Checkout(ctx);
  checkout.run();
};
testCheckout(context);
/**
 * End Checkout test
 */
