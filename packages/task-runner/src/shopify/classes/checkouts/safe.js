import Checkout from '../checkout';

const { States } = require('../utils/constants').TaskRunner;

class SafeCheckout extends Checkout {
  async createCheckout() {
    const { message, shouldBan, nextState } = await super.createCheckout();

    switch (nextState) {
      case States.SUBMIT_SHIPPING: {
        return {
          message: 'Adding to cart',
          nextState: States.ADD_TO_CART,
        };
      }
      default: {
        return { message, shouldBan, nextState };
      }
    }
  }
  /**
   * *THIS IS JUST THE CHECKOUT PROCESS*
   * 1.* Login
   * 1. Create checkout
   * 2. Add to cart
   * 3. Go to checkout
   * 3*. Request captcha
   * 4. Submit customer information
   * 5. Go to shipping
   * 6. Submit shipping
   * 7. Go to payment
   * 8. Submit payment
   * 8.* Complete payment (not always needed)
   * 9. Process payment
   */
}

module.exports = SafeCheckout;
