/* global describe */
import tDefns, { initialTaskStates } from '../../../../utils/definitions/taskDefinitions';
import { setupConsoleErrorSpy, testKey } from '../../../../__testUtils__/definitionTestUtils';

describe('taskSite definitions', () => {
  const spy = setupConsoleErrorSpy();

  const testSiteKey = (keyName, valid, invalid) =>
    testKey(keyName, valid, invalid, tDefns.taskSite, initialTaskStates.site, spy);

  testSiteKey('name', 'valid_name', [1, true, {}]);
  testSiteKey('url', 'valid_url', [1, true, {}]);
  testSiteKey('supported', [true, false], [{}, 'false', 1]);
});
