/* global describe */
import sDefns, {
  initialSettingsStates,
} from '../../../../utils/definitions/settingsDefinitions';
import {
  setupConsoleErrorSpy,
  testKey,
} from '../../../../__testUtils__/definitionTestUtils';

describe('settings definitions', () => {
  const spy = setupConsoleErrorSpy();

  const testSettingKey = (keyName, valid, invalid) =>
    testKey(
      keyName,
      valid,
      invalid,
      sDefns.settings,
      initialSettingsStates.settings,
      spy,
    );

  testSettingKey('slack', [null, 'testing'], [{}, 3, false]);
  testSettingKey('discord', [null, 'testing'], [{}, 4, false]);
  testSettingKey(
    'proxies',
    [
      [],
      [
        'test',
        {},
        {
          ip: 'i',
          port: 0,
          username: 'u',
          password: 'p',
        },
      ],
    ],
    [{}, 3, false, [false], [3]],
  );
});
