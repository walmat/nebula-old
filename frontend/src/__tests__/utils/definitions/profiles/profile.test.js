/* global describe */
import pDefns, {
  initialProfileStates,
} from '../../../../utils/definitions/profileDefinitions';
import {
  setupConsoleErrorSpy,
  testKey,
} from '../../../../__testUtils__/definitionTestUtils';

describe('profile definitions', () => {
  const spy = setupConsoleErrorSpy();

  const testProfileKey = (key, validKey, invalidKey) =>
    testKey(
      key,
      validKey,
      invalidKey,
      pDefns.profile,
      initialProfileStates.profile,
      spy,
    );

  testProfileKey('id', ['1', 1], true);
  testProfileKey('profileName', 'valid', [false, 3]);
  testProfileKey('billingMatchesShipping', [true, false], [1, 'false']);
  testProfileKey(
    'errors',
    [{ profileName: true }, { profileName: false }],
    [1, 'test'],
  );
});
