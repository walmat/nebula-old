/* global describe */
import tDefns, { initialTaskStates } from '../../../../utils/definitions/taskDefinitions';
import { setupConsoleErrorSpy, testKey } from '../../../../__testUtils__/definitionTestUtils';

describe('taskProduct definitions', () => {
  const spy = setupConsoleErrorSpy();

  const testProductKey = (keyName, valid, invalid) =>
    testKey(keyName, valid, invalid, tDefns.taskProduct, initialTaskStates.product, spy);

  testProductKey('raw', [null, '', 'testing'], [{}, false, 1]);
  testProductKey('variant', [null, '', 'testing'], [{}, false, 1]);
  testProductKey(
    'pos_keywords',
    [[], ['testing'], ['a', 'b']],
    [{}, 1, false, [1, '2'], [false, '2']],
  );
  testProductKey(
    'neg_keywords',
    [[], ['testing'], ['a', 'b']],
    [{}, 1, false, [1, '2'], [false, '2']],
  );
  testProductKey('url', [null, '', 'testing'], [{}, false, 1]);
});
