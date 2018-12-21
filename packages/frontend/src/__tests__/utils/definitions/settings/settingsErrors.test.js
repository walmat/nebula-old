/* global describe */
import sDefns, {
  initialSettingsStates,
} from '../../../../utils/definitions/settingsDefinitions';
import {
  setupConsoleErrorSpy,
  testKey,
} from '../../../../__testUtils__/definitionTestUtils';

describe('settingsErrors definitions', () => {
  const spy = setupConsoleErrorSpy();

  const testSettingsErrorKey = (keyName, valid, invalid) =>
    testKey(
      keyName,
      valid,
      invalid,
      sDefns.settingsErrors,
      initialSettingsStates.settingsErrors,
      spy
    );

  testSettingsErrorKey('discord', [null, true, false], [{}, 'testing', 3]);
  testSettingsErrorKey('slack', [null, true, false], [{}, 'testing', 2]);
});
