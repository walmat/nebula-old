/* global describe it expect */
import tDefns, { initialTaskStates } from '../../../../utils/definitions/taskDefinitions';
import { setupConsoleErrorSpy, testArray } from '../../../../__testUtils__/definitionTestUtils';

describe('taskList definitions', () => {
  const spy = setupConsoleErrorSpy();

  testArray(
    [initialTaskStates.task, { id: 'test1', status: 'running' }],
    [{ id: true }, { id: 3, product: [] }, { id: 'test5', site: [] }],
    tDefns.taskList,
    initialTaskStates.list,
    spy,
  );
});
