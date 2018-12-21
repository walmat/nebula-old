/* global describe */
import sDefns, {
  initialServerStates,
} from '../../../../utils/definitions/serverDefinitions';
import {
  setupConsoleErrorSpy,
  testKey,
} from '../../../../__testUtils__/definitionTestUtils';

describe('proxyOptions definitions', () => {
  const spy = setupConsoleErrorSpy();

  const testProxyOptionKey = (keyName, valid, invalid) =>
    testKey(
      keyName,
      valid,
      invalid,
      sDefns.proxyOptions,
      initialServerStates.proxyOptions,
      spy
    );

  testProxyOptionKey('numProxies', [null, '30', 30], [{}, false]);
  testProxyOptionKey('username', [null, 'test'], [{}, 3, false]);
  testProxyOptionKey('password', [null, 'test'], [{}, 3, false]);
});
