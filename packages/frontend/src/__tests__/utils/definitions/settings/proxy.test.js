/* global describe */
import sDefns, {
  initialSettingsStates,
} from '../../../../utils/definitions/settingsDefinitions';
import {
  setupConsoleErrorSpy,
  testKey,
  testValue,
} from '../../../../__testUtils__/definitionTestUtils';

describe('proxy definitions', () => {
  const spy = setupConsoleErrorSpy();

  const testProxyKey = (keyName, valid, invalid) =>
    testKey(
      keyName,
      valid,
      invalid,
      sDefns.proxy,
      initialSettingsStates.proxy,
      spy
    );

  testProxyKey('ip', [null, '0.0.0.0'], [{}, 3, false]);
  testProxyKey('port', [null, '80', 80], [{}, false]);
  testProxyKey('username', [null, 'test'], [{}, 3, false]);
  testProxyKey('password', [null, 'test'], [{}, 3, false]);

  testValue([null, 'test', {}], [false, 3], sDefns.proxy, spy);
});
