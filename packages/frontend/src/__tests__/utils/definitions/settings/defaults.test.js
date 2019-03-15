/* global describe */
import sDefns, { initialSettingsStates } from '../../../../utils/definitions/settingsDefinitions';
import { setupConsoleErrorSpy, testKey } from '../../../../__testUtils__/definitionTestUtils';

describe('defaults definitions', () => {
  const spy = setupConsoleErrorSpy();

  const testDefaultsKey = (keyName, valid, invalid) =>
    testKey(keyName, valid, invalid, sDefns.defaults, initialSettingsStates.defaults, spy);

  testDefaultsKey(
    'profile',
    [{ id: 1, profileName: 'testing' }, { id: 2 }],
    [{ id: false }, { id: 2, profileName: false }],
  );
  testDefaultsKey(
    'sizes',
    [null, [], ['9', '9.5']],
    ['test', false, {}, [false, true], [{ value: true }, { label: true }]],
  );
  testDefaultsKey('useProfile', [null, false, true], ['test', 1, [], {}]);
  testDefaultsKey('useSizes', [null, false, true], ['test', 1, [], {}]);
});
