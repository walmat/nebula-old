import Checkout from '../checkout';

class FastCheckout extends Checkout {
  /**
   * *THIS IS JUST THE CHECKOUT PROCESS*
   * 1.* Login
   * 1. Create checkout
   * 2. Send shipping info
   * **Once product is found**
   * 3. Add to cart
   * Concurrently 4a and 4b:
   * 4a. Go to checkout
   * 4b. Get shipping rates
   * **if 4a shows we need captcha**
   * 4c.* Request captcha
   * 5. (WAIT ON ALL STEP 4s!) Submit payment
   * 5*. Complete payment (not always needed)
   * 6. Process payment
   */
}

module.exports = FastCheckout;
