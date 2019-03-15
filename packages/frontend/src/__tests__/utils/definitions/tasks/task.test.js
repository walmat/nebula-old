/* global describe */
import tDefns from '../../../../utils/definitions/taskDefinitions';
import initialTaskStates from '../../../../state/initial/tasks';
import { setupConsoleErrorSpy, testKey } from '../../../../__testUtils__/definitionTestUtils';

describe('task definitions', () => {
  const spy = setupConsoleErrorSpy();

  const testTaskKey = (keyName, valid, invalid) =>
    testKey(keyName, valid, invalid, tDefns.task, initialTaskStates.task, spy);

  testTaskKey('id', [null, 'test'], [false, 1, {}, []]);
  testTaskKey('index', [null, 1], [false, '1', {}, []]);
  testTaskKey('sizes', [null, ['1', '2', '3', '4.5']], [{}, 'test', 3, [{}], [3]]);
  testTaskKey('username', [null, '', 'testing'], [{}, false, 3]);
  testTaskKey('password', [null, '', 'testing'], [{}, false, 3]);
  testTaskKey('status', [null, '', 'testing'], [{}, false, 3]);
  testTaskKey('errorDelay', [null, 1, 2.3], [{}, 'testing', false]);
  testTaskKey('monitorDelay', [null, 1, 2.3], [{}, 'testing', false]);
});
