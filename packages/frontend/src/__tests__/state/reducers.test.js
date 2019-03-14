/* global describe it expect beforeEach */
import { globalActions, GLOBAL_ACTIONS } from '../../state/actions';
import topLevelReducer, { initialState } from '../../state/reducers';
import { THEMES } from '../../constants/themes';

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

  describe('should handle a set theme action', () => {
    test('when valid action is passed', () => {
      const expected = { ...nonInitialState, theme: 'dark' };
      const actual = topLevelReducer(nonInitialState, globalActions.setTheme(THEMES.DARK));
      expect(actual).not.toEqual(nonInitialState);
      expect(actual).toEqual(expected);
    });

    test('when invalid action is passed', () => {
      const actual = topLevelReducer(nonInitialState, { type: GLOBAL_ACTIONS.SET_THEME });
      expect(actual).toEqual(nonInitialState);
    });
  });

  describe('should handle a migrate state action', () => {
    test('when unversioned', () => {
      const start = { ...nonInitialState };
      delete start.version;
      const actual = topLevelReducer(start, globalActions.migrateState());
      expect(actual).toEqual(nonInitialState);
    });

    test('when version 0.1.0', () => {
      const start = { ...nonInitialState };
      start.version = '0.1.0';
      const actual = topLevelReducer(start, globalActions.migrateState());
      expect(actual).toEqual(nonInitialState);
    });
  });
});
