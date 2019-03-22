/* global describe it expect */
import ratesReducer from '../../../../state/reducers/profiles/ratesReducer';
import initialProfileStates from '../../../../state/initial/profiles';

describe('rates reducer', () => {
  it('should return initial state', () => {
    const actual = ratesReducer(undefined, {});
    expect(actual).toEqual(initialProfileStates.rates);
  });

  it('should not respond to invalid actions', () => {
    const actual = ratesReducer(initialProfileStates.rates, {
      type: 'INVALID',
    });
    expect(actual).toEqual(initialProfileStates.rates);
  });
});
