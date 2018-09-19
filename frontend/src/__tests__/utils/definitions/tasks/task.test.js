/* global describe */
import tDefns, { initialTaskStates } from '../../../../utils/definitions/taskDefinitions';
import { setupConsoleErrorSpy, testKey } from '../../../../__testUtils__/definitionTestUtils';

describe('task definitions', () => {
  const spy = setupConsoleErrorSpy();

  const testTaskKey = (keyName, valid, invalid) =>
    testKey(
      keyName,
      valid,
      invalid,
      tDefns.task,
      initialTaskStates.task,
      spy,
    );

  testTaskKey('id', [null, '1', 1], false);
  testTaskKey('sizes', [null, ['1', '2', '3', '4.5']], [{}, 'test', 3, [{}], [3]]);
  testTaskKey('username', [null, '', 'testing'], [{}, false, 3]);
  testTaskKey('password', [null, '', 'testing'], [{}, false, 3]);
  testTaskKey('status', [null, '', 'testing'], [{}, false, 3]);
  testTaskKey('error_delay', [null, 1, 2.3], [{}, 'testing', false]);
  testTaskKey('refresh_delay', [null, 1, 2.3], [{}, 'testing', false]);
});
