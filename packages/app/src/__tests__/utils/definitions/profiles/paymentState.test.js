/* global describe */
import pDefns from '../../../../utils/definitions/profileDefinitions';
import initialProfileStates from '../../../../state/initial/profiles';
import { setupConsoleErrorSpy, testKey } from '../../../../__testUtils__/definitionTestUtils';

describe('paymentState definitions', () => {
  const spy = setupConsoleErrorSpy();

  const testPaymentKey = (keyName, valid, invalid) =>
    testKey(keyName, valid, invalid, pDefns.paymentState, initialProfileStates.payment, spy);

  testPaymentKey('email', 'test@test.com', {});
  testPaymentKey('cardNumber', '411111111111', {});
  testPaymentKey('exp', '12/34', {});
  testPaymentKey('cvv', '123', {});
});
