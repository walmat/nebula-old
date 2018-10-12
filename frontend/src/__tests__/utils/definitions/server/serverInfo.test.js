/* global describe */
import sDefns, { initialServerStates } from '../../../../utils/definitions/serverDefinitions';
import { setupConsoleErrorSpy, testKey } from '../../../../__testUtils__/definitionTestUtils';

describe('serverInfo definitions', () => {
  const spy = setupConsoleErrorSpy();

  const testServerInfoKey = (keyName, valid, invalid) =>
    testKey(
      keyName,
      valid,
      invalid,
      sDefns.serverInfo,
      initialServerStates.serverInfo,
      spy,
    );

  testServerInfoKey(
    'proxies',
    [
      [],
      ['test', {}, {
        ip: 'i',
        port: 0,
        username: 'u',
        password: 'p',
      }],
    ],
    [
      {},
      3,
      false,
      [false],
      [3],
    ],
  );
});
