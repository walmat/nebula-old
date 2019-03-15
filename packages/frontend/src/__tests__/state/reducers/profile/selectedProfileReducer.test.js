/* global describe it expect test */
import { selectedProfileReducer } from '../../../../state/reducers/profiles/profileReducer';
import initialProfileStates from '../../../../state/initial/profiles';
import { PROFILE_ACTIONS } from '../../../../state/actions';

describe('selected profile reducer', () => {
  it('should return initial state', () => {
    const actual = selectedProfileReducer(undefined, {});
    expect(actual).toEqual(initialProfileStates.profile);
  });

  describe('should handle select action', () => {
    test('when valid profile is given', () => {
      const start = {
        ...initialProfileStates.profile,
        id: 1,
        profileName: 'testing',
      };
      const expected = {
        ...initialProfileStates.profile,
        id: 2,
        profileName: 'test2',
      };
      const actual = selectedProfileReducer(start, {
        type: PROFILE_ACTIONS.SELECT,
        profile: expected,
      });
      expect(actual).toEqual(expected);
    });

    test('when profile is not given', () => {
      const start = {
        ...initialProfileStates.profile,
        id: 1,
        profileName: 'testing',
      };
      const actual = selectedProfileReducer(start, {
        type: PROFILE_ACTIONS.SELECT,
      });
      expect(actual).toEqual(start);
    });
  });

  describe('should handle remove action', () => {
    test('when action object is valid with id matching', () => {
      const start = {
        ...initialProfileStates.profile,
        id: 1,
        profileName: 'testing',
      };
      const actual = selectedProfileReducer(start, {
        type: PROFILE_ACTIONS.REMOVE,
        id: 1,
      });
      expect(actual).toEqual(initialProfileStates.profile);
    });

    test('when action object is valid with id not matching', () => {
      const start = {
        ...initialProfileStates.profile,
        id: 1,
        profileName: 'testing',
      };
      const actual = selectedProfileReducer(start, {
        type: PROFILE_ACTIONS.REMOVE,
        id: 2,
      });
      expect(actual).toEqual(start);
    });

    test('when id is not defined', () => {
      const start = {
        ...initialProfileStates.profile,
        id: 1,
        profileName: 'testing',
      };
      const actual = selectedProfileReducer(start, {
        type: PROFILE_ACTIONS.REMOVE,
      });
      expect(actual).toEqual(start);
    });
  });

  describe('should handle update action', () => {
    test('when valid profile is given', () => {
      const start = {
        ...initialProfileStates.profile,
        id: 1,
        profileName: 'test',
      };
      const expected = {
        ...initialProfileStates.profile,
        id: 1,
        profileName: 'new test',
      };
      const actual = selectedProfileReducer(start, {
        type: PROFILE_ACTIONS.UPDATE,
        id: 1,
        profile: expected,
      });
      expect(actual).toEqual(expected);
    });

    test('when valid profile is given, but id is not', () => {
      const start = {
        ...initialProfileStates.profile,
        id: 1,
        profileName: 'test',
      };
      const profile = {
        ...initialProfileStates.profile,
        id: 1,
        profileName: 'new test',
      };
      const actual = selectedProfileReducer(start, {
        type: PROFILE_ACTIONS.UPDATE,
        profile,
      });
      expect(actual).toEqual(profile);
    });

    test('when valid profile and invalid id are given', () => {
      const start = {
        ...initialProfileStates.profile,
        id: 1,
        profileName: 'test',
      };
      const profile = {
        ...initialProfileStates.profile,
        id: 1,
        profileName: 'new test',
      };
      const actual = selectedProfileReducer(start, {
        type: PROFILE_ACTIONS.UPDATE,
        profile,
        id: 3,
      });
      expect(actual).toEqual(start);
    });

    test('when invalid profile is given, but id is not', () => {
      const start = {
        ...initialProfileStates.profile,
        id: 1,
        profileName: 'test',
      };
      const actual = selectedProfileReducer(start, {
        type: PROFILE_ACTIONS.UPDATE,
        profile: {},
      });
      expect(actual).toEqual(start);
    });

    test('when id and profile are not given', () => {
      const start = {
        ...initialProfileStates.profile,
        id: 1,
        profileName: 'test',
      };
      const actual = selectedProfileReducer(start, {
        type: PROFILE_ACTIONS.UPDATE,
      });
      expect(actual).toEqual(start);
    });

    test('when id is given and profile is not given', () => {
      const start = {
        ...initialProfileStates.profile,
        id: 1,
        profileName: 'test',
      };
      const actual = selectedProfileReducer(start, {
        type: PROFILE_ACTIONS.UPDATE,
        id: 1,
      });
      expect(actual).toEqual(start);
    });
  });

  describe('should not respond to', () => {
    const _testNoopResponse = type => {
      const actual = selectedProfileReducer(initialProfileStates.profile, {
        type,
      });
      expect(actual).toEqual(initialProfileStates.profile);
    };

    test('add action', () => {
      _testNoopResponse(PROFILE_ACTIONS.ADD);
    });

    test('edit action', () => {
      _testNoopResponse(PROFILE_ACTIONS.EDIT);
    });

    test('load action', () => {
      _testNoopResponse(PROFILE_ACTIONS.LOAD);
    });

    test('error action', () => {
      _testNoopResponse(PROFILE_ACTIONS.ERROR);
    });
  });
});
