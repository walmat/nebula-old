/* global describe it expect */
import PropTypes from 'prop-types';

import tDefns, { initialTaskStates } from '../../../../utils/definitions/taskDefinitions';
import { setupConsoleErrorSpy, testArray } from '../../../../__testUtils__/definitionTestUtils';

describe('taskList definitions', () => {
  const spy = setupConsoleErrorSpy();

  testArray(
    [
      initialTaskStates.task,
      { id: 1, status: 'running' },
    ],
    [
      { id: true },
      { id: 3, product: [] },
      { id: 5, site: [] },
    ],
    tDefns.taskList,
    initialTaskStates.list,
    spy,
  );
});
