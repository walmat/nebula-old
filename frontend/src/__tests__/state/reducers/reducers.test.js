/* global describe it test expect jest */
import topLevelReducer, { initialState } from '../../../state/reducers';

describe('top level reducer', () => {
  it('should return the initial state', () => {
    const actual = topLevelReducer(undefined, {});
    expect(actual).toEqual(initialState);
  });

  it('should not respond to invalid actions', () => {
    const actual = topLevelReducer(initialState, { type: 'INVALID_ACTION' });
    expect(actual).toEqual(initialState);
  });
});
