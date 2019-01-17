/* eslint-disable no-empty-function */
/* eslint-disable class-methods-use-this */
const Checkout = require('../checkout');

class FrontendCheckout extends Checkout {
  constructor(context) {
    super(context);
    this._context = context;
  }

  async login() {
    super.login();
  }

  async paymentToken() {
    super.paymentToken();
  }

  async addToCart() {}

  async createCheckout() {}

  async pollQueue() {
    super.pollQueue();
  }

  async shippingRates() {}

  async harvestCaptcha() {
    super.harvestCaptcha();
  }

  async postCustomerInformation() {}

  async paymentGateway() {}

  async postPayment() {}

  async paymentProcessing() {}
}
module.exports = FrontendCheckout;
