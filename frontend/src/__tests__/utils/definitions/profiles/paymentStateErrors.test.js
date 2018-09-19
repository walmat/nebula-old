/* global describe */
import paymentStateErrors, { initialPaymentStateErrors } from '../../../../utils/definitions/profiles/paymentStateErrors';
import { setupConsoleErrorSpy, testKey } from '../../../../__testUtils__/definitionTestUtils';

describe('paymentStateErrors definitions', () => {
  const spy = setupConsoleErrorSpy();

  testKey('email', true, 'false', paymentStateErrors, initialPaymentStateErrors, spy);
  testKey('cardNumber', true, 'false', paymentStateErrors, initialPaymentStateErrors, spy);
  testKey('exp', true, 'false', paymentStateErrors, initialPaymentStateErrors, spy);
  testKey('cvv', true, 'false', paymentStateErrors, initialPaymentStateErrors, spy);
});
