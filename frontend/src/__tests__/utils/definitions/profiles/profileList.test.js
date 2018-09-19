/* global describe it expect */
import PropTypes from 'prop-types';

import pDefns, { initialProfileStates } from '../../../../utils/definitions/profileDefinitions';
import { setupConsoleErrorSpy } from '../../../../__testUtils__/definitionTestUtils';

describe('profileList definitions', () => {
  const spy = setupConsoleErrorSpy();

  const specWrapper = {
    test: pDefns.profileList,
  };

  it('should succeed when an empty array is passed', () => {
    const testState = {
      test: [],
    };
    PropTypes.checkPropTypes(specWrapper, testState, 'test', 'success check');
    expect(spy.consoleError).not.toHaveBeenCalled();
  });

  it('should succeed when a non-empty array of profiles is passed', () => {
    const testState = {
      test: [initialProfileStates.profile],
    };
    PropTypes.checkPropTypes(specWrapper, testState, 'test', 'success check');
    expect(spy.consoleError).not.toHaveBeenCalled();
  });

  it('should fail when a non-empty array of invalid profiles is passed', () => {
    const testState = {
      test: [{ id: true }],
    };
    PropTypes.checkPropTypes(specWrapper, testState, 'test', 'fail check');
    expect(spy.consoleError).toHaveBeenCalled();
  });

  it('should fail when an object is passed', () => {
    const testState = {
      test: { object: 'invalid' },
    };
    PropTypes.checkPropTypes(specWrapper, testState, 'test', 'fail check');
    expect(spy.consoleError).toHaveBeenCalled();
  });
});
