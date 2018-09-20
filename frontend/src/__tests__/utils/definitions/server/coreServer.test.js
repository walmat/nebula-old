/* global describe */
import sDefns, { initialServerStates } from '../../../../utils/definitions/serverDefinitions';
import { setupConsoleErrorSpy, testKey } from '../../../../__testUtils__/definitionTestUtils';

describe('coreServer definitions', () => {
  const spy = setupConsoleErrorSpy();

  const testCoreServerKey = (keyName, valid, invalid) =>
    testKey(
      keyName,
      valid,
      invalid,
      sDefns.coreServer,
      initialServerStates.coreServer,
      spy,
    );

  testCoreServerKey('path', [null, 'test'], [{}, 3, false]);
});
