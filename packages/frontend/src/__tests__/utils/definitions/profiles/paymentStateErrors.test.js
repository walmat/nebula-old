/* global describe */
import pDefns from '../../../../utils/definitions/profileDefinitions';
import initialProfileStates from '../../../../state/initial/profiles';
import { setupConsoleErrorSpy, testKey } from '../../../../__testUtils__/definitionTestUtils';

describe('paymentStateErrors definitions', () => {
  const spy = setupConsoleErrorSpy();

  const testErrorKey = (keyName, valid, invalid) =>
    testKey(
      keyName,
      valid,
      invalid,
      pDefns.paymentStateErrors,
      initialProfileStates.paymentErrors,
      spy,
    );

  testErrorKey('email', true, 'false');
  testErrorKey('cardNumber', true, 'false');
  testErrorKey('exp', true, 'false');
  testErrorKey('cvv', true, 'false');
});
