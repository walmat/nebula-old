/* global describe it expect test jest */
import profileListReducer from '../../../../state/reducers/profiles/profileListReducer';
import { initialProfileStates } from '../../../../utils/definitions/profileDefinitions';
import { PROFILE_ACTIONS, PROFILE_FIELDS } from '../../../../state/actions';

describe('profile list reducer', () => {
  it('should return initial state', () => {
    const actual = profileListReducer(undefined, {});
    expect(actual).toEqual(initialProfileStates.list);
  });

  describe('should handle add', () => {
    test('when valid action is passed', () => {
      const actual = profileListReducer(initialProfileStates.list, {
        type: PROFILE_ACTIONS.ADD,
        profile: initialProfileStates.profile,
      });
      expect(actual.length).toBe(initialProfileStates.list.length + 1);
      expect(actual[actual.length - 1].id).toBeDefined();
      const expected = initialProfileStates.list.splice(0);
      expected.push({
        ...initialProfileStates.profile,
        id: actual[actual.length - 1].id,
      });
      expect(actual).toEqual(expected);
    });

    test('when given profile has billing matches shipping', () => {
      const profile = {
        ...initialProfileStates.profile,
        billing: {
          ...initialProfileStates.location,
          firstName: 'billingTest',
        },
        shipping: {
          ...initialProfileStates.location,
          firstName: 'test',
        },
        billingMatchesShipping: true,
      };
      const expectedProfile = {
        ...initialProfileStates.profile,
        billing: profile.shipping,
        shipping: profile.shipping,
        billingMatchesShipping: true,
      };
      const actual = profileListReducer(initialProfileStates.list, {
        type: PROFILE_ACTIONS.ADD,
        profile,
      });
      expect(actual.length).toBe(initialProfileStates.list.length + 1);
      expect(actual[actual.length - 1].id).toBeDefined();
      const expected = initialProfileStates.list.splice(0);
      expected.push({
        ...expectedProfile,
        id: actual[actual.length - 1].id,
      });
      expect(actual).toEqual(expected);
    });

    test('when profile is not given', () => {
      const actual = profileListReducer(initialProfileStates.list, {
        type: PROFILE_ACTIONS.ADD,
      });
      expect(actual).toEqual(initialProfileStates.list);
    });

    it('should bypass on errors', () => {
      const start = [
        {
          ...initialProfileStates.profile,
          id: 1,
        },
      ];

      const actual = profileListReducer(start, {
        type: PROFILE_ACTIONS.ADD,
        id: 1,
        errors: {},
      });
      expect(actual).toEqual(start);
    });
  });

  describe('should handle remove', () => {
    test('when valid action is passed', () => {
      const start = [
        {
          ...initialProfileStates.profile,
          id: 1,
        },
        {
          ...initialProfileStates.profile,
          id: 2,
        },
      ];
      const expected = [
        {
          ...initialProfileStates.profile,
          id: 2,
        },
      ];
      const actual = profileListReducer(start, {
        type: PROFILE_ACTIONS.REMOVE,
        id: 1,
      });
      expect(actual).toEqual(expected);
    });

    test('when id is null', () => {
      const start = [
        {
          ...initialProfileStates.profile,
          id: 1,
        },
        {
          ...initialProfileStates.profile,
          id: 2,
        },
      ];
      const actual = profileListReducer(start, {
        type: PROFILE_ACTIONS.REMOVE,
        id: null,
      });
      expect(actual).toEqual(start);
    });

    test('when id is not given', () => {
      const start = [
        {
          ...initialProfileStates.profile,
          id: 1,
        },
        {
          ...initialProfileStates.profile,
          id: 2,
        },
      ];
      const actual = profileListReducer(start, {
        type: PROFILE_ACTIONS.REMOVE,
      });
      expect(actual).toEqual(start);
    });

    test('when given id is not in the state', () => {
      const start = [
        {
          ...initialProfileStates.profile,
          id: 1,
        },
        {
          ...initialProfileStates.profile,
          id: 2,
        },
      ];
      const actual = profileListReducer(start, {
        type: PROFILE_ACTIONS.REMOVE,
        id: 3,
      });
      expect(actual).toEqual(start);
    });
  });

  describe('should handle edit', () => {
    test('when valid action is passed', () => {
      const start = [
        {
          ...initialProfileStates.profile,
          id: 1,
          profileName: 'test',
        },
      ];
      const expected = [
        {
          ...initialProfileStates.profile,
          id: 1,
          profileName: 'changed',
        },
      ];
      const actual = profileListReducer(start, {
        type: PROFILE_ACTIONS.EDIT,
        id: 1,
        field: PROFILE_FIELDS.EDIT_NAME,
        value: 'changed',
      });
      expect(actual).toEqual(expected);
    });

    test('when id is null', () => {
      const start = [
        {
          ...initialProfileStates.profile,
          id: 1,
          profileName: 'test',
        },
      ];
      const actual = profileListReducer(start, {
        type: PROFILE_ACTIONS.EDIT,
        id: null,
        field: PROFILE_FIELDS.EDIT_NAME,
        value: 'changed',
      });
      expect(actual).toEqual(start);
    });

    test('when id is not given', () => {
      const start = [
        {
          ...initialProfileStates.profile,
          id: 1,
          profileName: 'test',
        },
      ];
      const actual = profileListReducer(start, {
        type: PROFILE_ACTIONS.EDIT,
        field: PROFILE_FIELDS.EDIT_NAME,
        value: 'changed',
      });
      expect(actual).toEqual(start);
    });

    test('when given id is not in the current state', () => {
      const start = [
        {
          ...initialProfileStates.profile,
          id: 1,
          profileName: 'test',
        },
      ];
      const actual = profileListReducer(start, {
        type: PROFILE_ACTIONS.EDIT,
        id: 3,
        field: PROFILE_FIELDS.EDIT_NAME,
        value: 'changed',
      });
      expect(actual).toEqual(start);
    });
  });

  describe('should handle update', () => {
    test('when valid action is passed', () => {
      const start = [
        {
          ...initialProfileStates.profile,
          id: 1,
          profileName: 'testing',
        },
      ];
      const profile = {
        ...initialProfileStates.profile,
        id: 2,
        profileName: 'test',
      };
      const expected = [
        {
          ...initialProfileStates.profile,
          id: 1,
          profileName: 'test',
        },
      ];
      const actual = profileListReducer(start, {
        type: PROFILE_ACTIONS.UPDATE,
        id: 1,
        profile,
      });
      expect(actual).toEqual(expected);
    });

    test('when id is null', () => {
      const start = [
        {
          ...initialProfileStates.profile,
          id: 1,
          profileName: 'testing',
        },
      ];
      const profile = {
        ...initialProfileStates.profile,
        id: 2,
        profileName: 'test',
      };
      const actual = profileListReducer(start, {
        type: PROFILE_ACTIONS.UPDATE,
        id: null,
        profile,
      });
      expect(actual).toEqual(start);
    });

    test('when id is not given', () => {
      const start = [
        {
          ...initialProfileStates.profile,
          id: 1,
          profileName: 'testing',
        },
      ];
      const profile = {
        ...initialProfileStates.profile,
        id: 2,
        profileName: 'test',
      };
      const actual = profileListReducer(start, {
        type: PROFILE_ACTIONS.UPDATE,
        profile,
      });
      expect(actual).toEqual(start);
    });

    test('when profile is not given', () => {
      const start = [
        {
          ...initialProfileStates.profile,
          id: 1,
          profileName: 'testing',
        },
      ];
      const actual = profileListReducer(start, {
        type: PROFILE_ACTIONS.UPDATE,
        id: 1,
      });
      expect(actual).toEqual(start);
    });

    it('should bypass on errors', () => {
      const start = [
        {
          ...initialProfileStates.profile,
          id: 1,
        },
      ];

      const actual = profileListReducer(start, {
        type: PROFILE_ACTIONS.UPDATE,
        id: 1,
        errors: {},
      });
      expect(actual).toEqual(start);
    });

    test('when given id is not in the current state', () => {
      const start = [
        {
          ...initialProfileStates.profile,
          id: 1,
          profileName: 'testing',
        },
      ];
      const profile = {
        ...initialProfileStates.profile,
        id: 2,
        profileName: 'test',
      };
      const actual = profileListReducer(start, {
        type: PROFILE_ACTIONS.UPDATE,
        id: 2,
        profile,
      });
      expect(actual).toEqual(start);
    });

    test('when errors map exists', () => {
      const start = [
        {
          ...initialProfileStates.profile,
          id: 1,
          profileName: 'testing',
        },
      ];
      const actual = profileListReducer(start, {
        type: PROFILE_ACTIONS.UPDATE,
        id: 2,
        errors: {},
      });
      expect(actual).toEqual(start);
    });
  });

  it('should handle error', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    profileListReducer(initialProfileStates.list, {
      type: PROFILE_ACTIONS.ERROR,
    });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  describe('should not respond to', () => {
    const _testNoopResponse = type => {
      const actual = profileListReducer(initialProfileStates.list, { type });
      expect(actual).toEqual(initialProfileStates.list);
    };

    test('select action', () => {
      _testNoopResponse(PROFILE_ACTIONS.SELECT);
    });

    test('load action', () => {
      _testNoopResponse(PROFILE_ACTIONS.LOAD);
    });
  });
});
