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
    it(`should ${isValid ? 'succeed' : 'fail'} when ${isValid ? '' : 'in'}valid value "${value}" is passed to ${keyName}`, () => {
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

export const testArray = (validEntries, invalidEntries, spec, initialEntries, spy) => {
  const specWrapper = {
    test: spec,
  };

  const _testArray = (value, isValid) => {
    it(`it should ${isValid ? 'succeed' : 'fail'} when a non-empty array containing ${isValid ? '' : 'in'}valid values is passed`, () => {
      const testArr = initialEntries.splice(0);
      if (Array.isArray(value)) {
        value.forEach(v => testArr.push(v));
      } else {
        testArr.push(value);
      }
      const testState = {
        test: testArr,
      };
      PropTypes.checkPropTypes(specWrapper, testState, 'test', `${isValid ? 'success' : 'failure'} check`);
      if (isValid) {
        expect(spy.consoleError).not.toHaveBeenCalled();
      } else {
        expect(spy.consoleError).toHaveBeenCalled();
      }
    });
  };

  it('should succeed when an empty array is passed', () => {
    const testState = {
      test: [],
    };
    PropTypes.checkPropTypes(specWrapper, testState, 'test', 'success check');
    expect(spy.consoleError).not.toHaveBeenCalled();
  });

  it('should fail when an object is passed', () => {
    const testState = {
      test: { object: 'invalid' },
    };
    PropTypes.checkPropTypes(specWrapper, testState, 'test', 'fail check');
    expect(spy.consoleError).toHaveBeenCalled();
  });

  // Test all valid entries at once
  _testArray(validEntries, true);

  // Test invalid entries one by one
  if (Array.isArray(invalidEntries)) {
    invalidEntries.forEach(value => _testArray(value, false));
  } else {
    _testArray(invalidEntries, false);
  }
};
