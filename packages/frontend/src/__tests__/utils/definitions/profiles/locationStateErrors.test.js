/* global describe */
import pDefns, { initialProfileStates } from '../../../../utils/definitions/profileDefinitions';
import { setupConsoleErrorSpy, testKey } from '../../../../__testUtils__/definitionTestUtils';

describe('locationStateErrors definitions', () => {
  const spy = setupConsoleErrorSpy();

  const testErrorKey = (keyName, valid, invalid) =>
    testKey(
      keyName,
      valid,
      invalid,
      pDefns.locationStateErrors,
      initialProfileStates.locationErrors,
      spy,
    );

  testErrorKey('firstName', true, 'false');
  testErrorKey('lastName', true, 'false');
  testErrorKey('address', true, 'false');
  testErrorKey('apt', true, 'false');
  testErrorKey('city', true, 'false');
  testErrorKey('country', true, 'false');
  testErrorKey('province', true, 'false');
  testErrorKey('zipCode', true, 'false');
  testErrorKey('phone', true, 'false');
});
