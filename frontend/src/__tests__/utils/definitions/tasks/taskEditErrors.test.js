/* global describe */
import tDefns, { initialTaskStates } from '../../../../utils/definitions/taskDefinitions';
import { setupConsoleErrorSpy, testKey } from '../../../../__testUtils__/definitionTestUtils';

describe('taskEditErrors definitions', () => {
  const spy = setupConsoleErrorSpy();

  const testErrorKey = (keyName, valid, invalid) =>
    testKey(
      keyName,
      valid,
      invalid,
      tDefns.taskEditErrors,
      initialTaskStates.editErrors,
      spy,
    );

  testErrorKey('product', [null, true, false], [{}, 'test', 3]);
  testErrorKey('sizes', [null, true, false], [{}, 'test', 3]);
  testErrorKey('profile', [null, true, false], [{}, 'test', 3]);
  testErrorKey('username', [null, true, false], [{}, 'test', 3]);
  testErrorKey('password', [null, true, false], [{}, 'test', 3]);
  testErrorKey('site', [null, true, false], [{}, 'test', 3]);
});
