/* global describe */
import sDefns from '../../../../utils/definitions/serverDefinitions';
import initialServerStates from '../../../../state/initial/servers';
import { setupConsoleErrorSpy, testKey } from '../../../../__testUtils__/definitionTestUtils';

describe('serverProperty definitions', () => {
  const spy = setupConsoleErrorSpy();

  const testPropertyKey = (keyName, valid, invalid) =>
    testKey(
      keyName,
      valid,
      invalid,
      sDefns.serverProperty,
      initialServerStates.serverProperty,
      spy,
    );

  testPropertyKey('id', [null, 3], [{}, 'test', false]);
  testPropertyKey('value', [null, 'test'], [{}, 3, false]);
  testPropertyKey('label', [null, 'test'], [{}, 3, false]);
});
