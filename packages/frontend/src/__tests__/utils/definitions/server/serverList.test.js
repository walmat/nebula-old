/* global describe */
import sDefns from '../../../../utils/definitions/serverDefinitions';
import initialServerStates from '../../../../state/initial/servers';
import {
  setupConsoleErrorSpy,
  testKey,
  testArray,
} from '../../../../__testUtils__/definitionTestUtils';

describe('serverList definitions', () => {
  const spy = setupConsoleErrorSpy();

  const testServerRowKey = (keyName, valid, invalid) =>
    testKey(keyName, valid, invalid, sDefns.server, initialServerStates.server, spy);

  testServerRowKey('charges', [null, 'test'], [{}, 3, false]);
  testServerRowKey('status', [null, 'test'], [{}, 3, false]);
  testServerRowKey('action', [null, 'test'], [{}, 3, false]);

  testArray(
    [
      { status: 'running' },
      { charges: 'test' },
      { action: 'test' },
      {
        action: 'test',
        charges: 'test',
        status: 'running',
        type: {
          id: 1,
          value: 'test',
          label: 'test',
        },
        size: {
          id: 1,
          value: 'test',
          label: 'test',
        },
        location: {
          id: 1,
          value: 'test',
          label: 'test',
        },
      },
    ],
    [
      { status: true },
      { action: true },
      { charges: true },
      { type: 'invalid' },
      { size: 'invalid' },
      { location: 'invalid' },
    ],
    sDefns.serverList,
    initialServerStates.serverList,
    spy,
  );
});
