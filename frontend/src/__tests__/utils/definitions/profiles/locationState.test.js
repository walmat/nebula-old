/* global describe */
import locationState, { initialLocationState } from '../../../../utils/definitions/profiles/locationState';
import { setupConsoleErrorSpy, testKey } from '../../../../__testUtils__/definitionTestUtils';

describe('locationState definitions', () => {
  const spy = setupConsoleErrorSpy();

  testKey('firstName', 'test', true, locationState, initialLocationState, spy);
  testKey('lastName', 'test', true, locationState, initialLocationState, spy);
  testKey('address', 'test', true, locationState, initialLocationState, spy);
  testKey('apt', 'test', true, locationState, initialLocationState, spy);
  testKey('city', 'test', true, locationState, initialLocationState, spy);
  testKey('country', { value: 'test_value', label: 'test_label' }, true, locationState, initialLocationState, spy);
  testKey('state', { value: 'test_value', label: 'test_label' }, true, locationState, initialLocationState, spy);
  testKey('zipCode', '12345', true, locationState, initialLocationState, spy);
  testKey('phone', '1234567890', true, locationState, initialLocationState, spy);
});
