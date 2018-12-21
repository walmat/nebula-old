/* global describe it expect */
import sDefns, {
  initialSettingsStates,
} from '../../../../utils/definitions/settingsDefinitions';
import {
  setupConsoleErrorSpy,
  testArray,
} from '../../../../__testUtils__/definitionTestUtils';

describe('proxyErrors definitions', () => {
  const spy = setupConsoleErrorSpy();

  testArray(
    [null, 1],
    [{}, 'testing', false],
    sDefns.proxyErrors,
    initialSettingsStates.proxyErrors,
    spy
  );
});
