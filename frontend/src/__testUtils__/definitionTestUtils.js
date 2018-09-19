/* global it expect beforeAll afterAll afterEach jest */
import PropTypes from 'prop-types';

export const setupConsoleErrorSpy = () => {
  const spy = {};

  beforeAll(() => {
    spy.consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    spy.consoleError.mockRestore();
  });

  afterEach(() => {
    spy.consoleError.mockClear();
  });

  return spy;
};

export const testKey = (keyName, validKey, invalidKey, spec, initialState, spy) => {
  const specWrapper = {
    test: spec,
  };

  const _testKey = (value, isValid) => {
    it(`should succeed when ${isValid ? '' : 'in'}valid value "${value}" is passed to ${keyName}`, () => {
      const testState = {
        test: {
          ...initialState,
          [keyName]: value,
        },
      };
      PropTypes.checkPropTypes(specWrapper, testState, 'test', `${isValid ? 'success' : 'failure'} check`);
      if (isValid) {
        expect(spy.consoleError).not.toHaveBeenCalled();
      } else {
        expect(spy.consoleError).toHaveBeenCalled();
      }
    });
  };

  if (Array.isArray(validKey)) {
    validKey.forEach(value => _testKey(value, true));
  } else {
    _testKey(validKey, true);
  }

  if (Array.isArray(invalidKey)) {
    invalidKey.forEach(value => _testKey(value, false));
  } else {
    _testKey(invalidKey, false);
  }
};
