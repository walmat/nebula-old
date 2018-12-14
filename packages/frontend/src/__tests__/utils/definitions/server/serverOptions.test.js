/* global describe */
import sDefns, {
  initialServerStates,
} from '../../../../utils/definitions/serverDefinitions';
import {
  setupConsoleErrorSpy,
  testKey,
} from '../../../../__testUtils__/definitionTestUtils';

describe('serverOptions definitions', () => {
  const spy = setupConsoleErrorSpy();

  const testServerOptionsKey = (keyName, valid, invalid) =>
    testKey(
      keyName,
      valid,
      invalid,
      sDefns.serverOptions,
      initialServerStates.serverOptions,
      spy,
    );

  testServerOptionsKey(
    'type',
    [null, {}, { id: 1, value: 'test', label: 'test' }],
    [false, 3, { id: 'test' }, { value: 3 }, { label: 3 }],
  );
  testServerOptionsKey(
    'size',
    [null, {}, { id: 1, value: 'test', label: 'test' }],
    [false, 3, { id: 'test' }, { value: 3 }, { label: 3 }],
  );
  testServerOptionsKey(
    'location',
    [null, {}, { id: 1, value: 'test', label: 'test' }],
    [false, 3, { id: 'test' }, { value: 3 }, { label: 3 }],
  );
});
