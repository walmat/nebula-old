/* global describe */
import tDefns, { initialTaskStates } from '../../../../utils/definitions/taskDefinitions';
import { setupConsoleErrorSpy, testKey } from '../../../../__testUtils__/definitionTestUtils';

describe('taskProductError definitions', () => {
  const spy = setupConsoleErrorSpy();

  const testProductErrorKey = (keyName, valid, invalid) =>
    testKey(
      keyName,
      valid,
      invalid,
      tDefns.taskProductErrors,
      initialTaskStates.productErrors,
      spy,
    );

  testProductErrorKey('raw', [null, true, false], [{}, 'false', 1]);
  testProductErrorKey('variant', [null, true, false], [{}, 'false', 1]);
  testProductErrorKey('pos_keywords', [null, true, false], [{}, 'false', 1]);
  testProductErrorKey('neg_keywords', [null, true, false], [{}, 'false', 1]);
  testProductErrorKey('url', [null, true, false], [{}, 'false', 1]);
});
