/* global describe */
import tDefns from '../../../../utils/definitions/taskDefinitions';
import initialTaskStates from '../../../../state/initial/tasks';
import { setupConsoleErrorSpy, testKey } from '../../../../__testUtils__/definitionTestUtils';

describe('taskError definitions', () => {
  const spy = setupConsoleErrorSpy();

  const testErrorKey = (keyName, valid, invalid) =>
    testKey(keyName, valid, invalid, tDefns.taskErrors, initialTaskStates.errors, spy);

  testErrorKey('site', [null, true, false], [{}, 'test', 3]);
  testErrorKey('profile', [null, true, false], [{}, 'test', 3]);
  testErrorKey('sizes', [null, true, false], [{}, 'test', 3]);
  testErrorKey('username', [null, true, false], [{}, 'test', 3]);
  testErrorKey('password', [null, true, false], [{}, 'test', 3]);
});
