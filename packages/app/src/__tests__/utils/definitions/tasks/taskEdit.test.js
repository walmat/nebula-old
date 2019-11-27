/* global describe */
import tDefns from '../../../../utils/definitions/taskDefinitions';
import initialTaskStates from '../../../../state/initial/tasks';
import { setupConsoleErrorSpy, testKey } from '../../../../__testUtils__/definitionTestUtils';

describe('taskEdit definitions', () => {
  const spy = setupConsoleErrorSpy();

  const testEditKey = (keyName, valid, invalid) =>
    testKey(keyName, valid, invalid, tDefns.taskEdit, initialTaskStates.edit, spy);

  testEditKey('sizes', [null, ['1', '2', '3', '4.5']], [{}, 'test', 3, [{}], [3]]);
  testEditKey('username', [null, '', 'test'], [{}, false, 3]);
  testEditKey('password', [null, '', 'test'], [{}, false, 3]);
});
