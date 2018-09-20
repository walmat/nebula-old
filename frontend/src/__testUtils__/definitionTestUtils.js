/* global it expect beforeEach afterEach jest */
import PropTypes from 'prop-types';

const getIdx = (() => {
  let idx = 0;
  return () => {
    idx += 1;
    return idx;
  };
})();

export const setupConsoleErrorSpy = () => {
  const spy = {};

  beforeEach(() => {
    spy.consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    spy.consoleError.mockRestore();
  });

  return spy;
};

export const testKey = (keyName, validKey, invalidKey, spec, initialState, spy) => {
  const _testKey = (value, isValid) => {
    it(`should ${isValid ? 'succeed' : 'fail'} when ${isValid ? '' : 'in'}valid value "${value}" is passed to ${keyName}`, () => {
      const idx = getIdx();
      const testState = {
        test: {
          ...initialState,
          [keyName]: value,
        },
      };
      PropTypes.checkPropTypes({ test: spec }, testState, 'test', `${isValid ? 'success' : 'failure'} check ${idx} for ${keyName}`);
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

export const testValue = (valid, invalid, spec, spy) => {
  const _testValue = (value, isValid) => {
    it(`should ${isValid ? 'succeed' : 'fail'} when ${isValid ? '' : 'in'}valid value "${value}" is passed to spec`, () => {
      const idx = getIdx();
      PropTypes.checkPropTypes({ value: spec }, { value }, 'test', `${isValid ? 'success' : 'failure'} check ${idx}`, () => {});
      if (isValid) {
        expect(spy.consoleError).not.toHaveBeenCalled();
      } else {
        expect(spy.consoleError).toHaveBeenCalled();
      }
    });
  };

  if (Array.isArray(valid)) {
    valid.forEach(v => _testValue(v, true));
  } else {
    _testValue(valid, true);
  }

  if (Array.isArray(invalid)) {
    invalid.forEach(v => _testValue(v, false));
  } else {
    _testValue(invalid, false);
  }
};

export const testArray = (validEntries, invalidEntries, spec, initialEntries, spy) => {
  const specWrapper = { test: spec };

  const _testArray = (value, isValid) => {
    it(`it should ${isValid ? 'succeed' : 'fail'} when a non-empty array containing ${isValid ? '' : 'in'}valid values is passed`, () => {
      const testArr = initialEntries.splice(0);
      const idx = getIdx();
      if (Array.isArray(value)) {
        value.forEach(v => testArr.push(v));
      } else {
        testArr.push(value);
      }
      const testState = {
        test: testArr,
      };
      PropTypes.checkPropTypes(specWrapper, testState, 'test', `${isValid ? 'success' : 'failure'} check ${idx}`);
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
