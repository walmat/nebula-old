/* global describe */
import sDefns, { initialServerStates } from '../../../../utils/definitions/serverDefinitions';
import { setupConsoleErrorSpy, testKey } from '../../../../__testUtils__/definitionTestUtils';

describe('serverListOptions definitions', () => {
  const spy = setupConsoleErrorSpy();

  const testServerListKey = (keyName, valid, invalid) =>
    testKey(
      keyName,
      valid,
      invalid,
      sDefns.serverListOptions,
      initialServerStates.serverListOptions,
      spy,
    );

  testServerListKey(
    'types',
    [
      [],
      [{
        id: 1,
        value: 'test',
        label: 'test',
      }],
    ],
    [
      {},
      3,
      false,
      [3],
      [false],
    ],
  );
  testServerListKey(
    'sizes',
    [
      [],
      [{
        id: 1,
        value: 'test',
        label: 'test',
      }],
    ],
    [
      {},
      3,
      false,
      [3],
      [false],
    ],
  );
  testServerListKey(
    'locations',
    [
      [],
      [{
        id: 1,
        value: 'test',
        label: 'test',
      }],
    ],
    [
      {},
      3,
      false,
      [3],
      [false],
    ],
  );
});
