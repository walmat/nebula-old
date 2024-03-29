/* global describe it expect */
import pDefns from '../../../../utils/definitions/profileDefinitions';
import initialProfileStates from '../../../../state/initial/profiles';
import { setupConsoleErrorSpy, testArray } from '../../../../__testUtils__/definitionTestUtils';

describe('profileList definitions', () => {
  const spy = setupConsoleErrorSpy();

  testArray(
    [initialProfileStates.profile, { id: 1, profileName: 'testing' }],
    [{ id: true }, { id: 2, profileName: 42 }],
    pDefns.profileList,
    initialProfileStates.list,
    spy,
  );
});
