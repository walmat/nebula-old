/* global describe it expect beforeEach */
import { globalActions } from '../../state/actions';
import topLevelReducer, { initialState } from '../../state/reducers';

describe('top level reducer', () => {
  let nonInitialState;

  beforeEach(() => {
    nonInitialState = {
      ...initialState,
      selectedProfile: {
        ...initialState.selectedProfile,
        id: 1,
        profileName: 'testing...',
      },
    };
  });

  it('should return an initial state', () => {
    const expected = initialState;
    const actual = topLevelReducer(undefined, {});
    expect(actual).toEqual(expected);
  });

  it('should handle an invalid action', () => {
    const expected = { ...nonInitialState };
    const actual = topLevelReducer(nonInitialState, { type: 'INVALID_ACTION' });
    expect(actual).toEqual(expected);
  });

  it('should handle a null action', () => {
    const expected = { ...nonInitialState };
    const actual = topLevelReducer(nonInitialState, null);
    expect(actual).toEqual(expected);
  });

  it('should handle an undefined action', () => {
    const expected = { ...nonInitialState };
    const actual = topLevelReducer(nonInitialState);
    expect(actual).toEqual(expected);
  });

  it('should handle a reset action', () => {
    const expected = { ...initialState };
    const actual = topLevelReducer(nonInitialState, globalActions.reset());
    expect(actual).not.toEqual(nonInitialState);
    expect(actual).toEqual(expected);
  });
});
