/* global describe */
import paymentState, { initialPaymentState } from '../../../../utils/definitions/profiles/paymentState';
import { setupConsoleErrorSpy, testKey } from '../../../../__testUtils__/definitionTestUtils';

describe('paymentState definitions', () => {
  const spy = setupConsoleErrorSpy();

  testKey('email', 'test@test.com', {}, paymentState, initialPaymentState, spy);
  testKey('cardNumber', '411111111111', {}, paymentState, initialPaymentState, spy);
  testKey('exp', '12/34', {}, paymentState, initialPaymentState, spy);
  testKey('cvv', '123', {}, paymentState, initialPaymentState, spy);
});