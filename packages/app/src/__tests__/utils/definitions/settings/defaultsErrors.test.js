/* global describe */
import sDefns from '../../../../utils/definitions/settingsDefinitions';
import initialSettingsStates from '../../../../state/initial/settings';
import { setupConsoleErrorSpy, testKey } from '../../../../__testUtils__/definitionTestUtils';

describe('defaultsErrors definitions', () => {
  const spy = setupConsoleErrorSpy();

  const testDefaultsErrorKey = (keyName, valid, invalid) =>
    testKey(
      keyName,
      valid,
      invalid,
      sDefns.defaultsErrors,
      initialSettingsStates.defaultsErrors,
      spy,
    );

  testDefaultsErrorKey('profile', [null, true, false], [{}, 'testing', 3]);
  testDefaultsErrorKey('sizes', [null, true, false], [{}, 'testing', 2]);
});
