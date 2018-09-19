/* global describe */
import locationStateErrors, { initialLocationStateErrors } from '../../../../utils/definitions/profiles/locationStateErrors';
import { setupConsoleErrorSpy, testKey } from '../../../../__testUtils__/definitionTestUtils';

describe('locationStateErrors definitions', () => {
  const spy = setupConsoleErrorSpy();

  testKey('firstName', true, 'false', locationStateErrors, initialLocationStateErrors, spy);
  testKey('lastName', true, 'false', locationStateErrors, initialLocationStateErrors, spy);
  testKey('address', true, 'false', locationStateErrors, initialLocationStateErrors, spy);
  testKey('apt', true, 'false', locationStateErrors, initialLocationStateErrors, spy);
  testKey('city', true, 'false', locationStateErrors, initialLocationStateErrors, spy);
  testKey('country', true, 'false', locationStateErrors, initialLocationStateErrors, spy);
  testKey('state', true, 'false', locationStateErrors, initialLocationStateErrors, spy);
  testKey('zipCode', true, 'false', locationStateErrors, initialLocationStateErrors, spy);
  testKey('phone', true, 'false', locationStateErrors, initialLocationStateErrors, spy);
});
