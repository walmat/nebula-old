/* global describe */
import pDefns from '../../../../utils/definitions/profileDefinitions';
import initialProfileStates from '../../../../state/initial/profiles';
import { setupConsoleErrorSpy, testKey } from '../../../../__testUtils__/definitionTestUtils';

describe('locationState definitions', () => {
  const spy = setupConsoleErrorSpy();

  const testLocationKey = (keyName, valid, invalid) =>
    testKey(keyName, valid, invalid, pDefns.locationState, initialProfileStates.location, spy);

  testLocationKey('firstName', 'test', true);
  testLocationKey('lastName', 'test', true);
  testLocationKey('address', 'test', true);
  testLocationKey('apt', 'test', true);
  testLocationKey('city', 'test', true);
  testLocationKey('country', { value: 'US', label: 'United States' }, true);
  testLocationKey(
    'province',
    {
      province: { value: 'AL', label: 'Alabama' },
      country: { value: 'US', label: 'United States' },
    },
    true,
  );
  testLocationKey('zipCode', '12345', true);
  testLocationKey('phone', '1234567890', true);
});
