/* global describe it expect test */
import { currentProfileReducer } from '../../../../state/reducers/profiles/profileReducer';
import { initialProfileStates } from '../../../../utils/definitions/profileDefinitions';
import {
  PROFILE_ACTIONS,
  PAYMENT_FIELDS,
  PROFILE_FIELDS,
} from '../../../../state/actions';

describe('current profile reducer', () => {
  it('should return initial state', () => {
    const actual = currentProfileReducer(undefined, {});
    expect(actual).toEqual(initialProfileStates.profile);
  });

  describe('should handle edit action', () => {
    describe('when id is null', () => {
      test('when action is valid object', () => {
        const expected = {
          ...initialProfileStates.profile,
          profileName: 'test',
        };
        const actual = currentProfileReducer(initialProfileStates.profile, {
          type: PROFILE_ACTIONS.EDIT,
          field: PROFILE_FIELDS.EDIT_NAME,
          value: 'test',
        });
        expect(actual).toEqual(expected);
      });

      test('when action is valid object with sub field', () => {
        const expected = {
          ...initialProfileStates.profile,
          payment: {
            ...initialProfileStates.payment,
            email: 'test',
          },
        };
        const actual = currentProfileReducer(initialProfileStates.profile, {
          type: PROFILE_ACTIONS.EDIT,
          field: PROFILE_FIELDS.EDIT_PAYMENT,
          value: 'test',
          subField: PAYMENT_FIELDS.EMAIL,
        });
        expect(actual).toEqual(expected);
      });

      describe('when action is invalid object', () => {
        const _testHandleInvalid = (message, action) => {
          test(message, () => {
            const actual = currentProfileReducer(
              initialProfileStates.profile,
              action
            );
            expect(actual).toEqual(initialProfileStates.profile);
          });
        };

        _testHandleInvalid('(no value)', {
          type: PROFILE_ACTIONS.EDIT,
          field: PROFILE_FIELDS.EDIT_NAME,
        });

        _testHandleInvalid('with subfield (no value)', {
          type: PROFILE_ACTIONS.EDIT,
          field: PROFILE_FIELDS.EDIT_PAYMENT,
          subField: PAYMENT_FIELDS.EMAIL,
        });

        _testHandleInvalid('(no subfield)', {
          type: PROFILE_ACTIONS.EDIT,
          field: PROFILE_FIELDS.EDIT_PAYMENT,
          value: 'test',
        });

        _testHandleInvalid('(invalid subfield)', {
          type: PROFILE_ACTIONS.EDIT,
          field: PROFILE_FIELDS.EDIT_PAYMENT,
          subField: 'INVALID',
          value: 'test',
        });

        _testHandleInvalid('(no field)', {
          type: PROFILE_ACTIONS.EDIT,
          value: 'test',
        });

        _testHandleInvalid('(invalid field)', {
          type: PROFILE_ACTIONS.EDIT,
          field: 'INVALID',
          value: 'test',
        });
      });
    });

    test('when id is non-null (noop)', () => {
      const start = {
        ...initialProfileStates.profile,
        profileName: 'testing...',
      };
      const actual = currentProfileReducer(start, {
        type: PROFILE_ACTIONS.EDIT,
        id: 1,
      });
      expect(actual).toEqual(start);
    });
  });

  describe('should handle add action', () => {
    test('when action object is valid', () => {
      const start = {
        ...initialProfileStates.profile,
        profileName: 'testing',
      };
      const actual = currentProfileReducer(start, {
        type: PROFILE_ACTIONS.ADD,
        profile: {},
      });
      expect(actual).toEqual(initialProfileStates.profile);
    });

    test('when profile is not defined', () => {
      const start = {
        ...initialProfileStates.profile,
        profileName: 'testing',
      };
      const actual = currentProfileReducer(start, {
        type: PROFILE_ACTIONS.ADD,
      });
      expect(actual).toEqual(start);
    });

    it('should bypass on errors', () => {
      const start = {
        ...initialProfileStates.profile,
        errors: {
          profileName: true,
          billingMatchesShipping: false,
        },
      };
      const actual = currentProfileReducer(start, {
        type: PROFILE_ACTIONS.ADD,
        profile: {},
        errors: {
          ...start.errors,
          billingMatchesShipping: true,
        },
      });
      expect(actual).toEqual({
        ...start,
        errors: {
          profileName: true,
          billingMatchesShipping: true,
        },
      });
    });
  });

  describe('should handle update action', () => {
    test('when action object is valid', () => {
      const start = {
        ...initialProfileStates.profile,
        profileName: 'testing',
      };
      const actual = currentProfileReducer(start, {
        type: PROFILE_ACTIONS.UPDATE,
        profile: {},
      });
      expect(actual).toEqual(initialProfileStates.profile);
    });

    test('when profile is not defined', () => {
      const start = {
        ...initialProfileStates.profile,
        profileName: 'testing',
      };
      const actual = currentProfileReducer(start, {
        type: PROFILE_ACTIONS.UPDATE,
      });
      expect(actual).toEqual(start);
    });

    test('when errors map exists', () => {
      const start = {
        ...initialProfileStates.profile,
        errors: {
          profileName: true,
          billingMatchesShipping: false,
        },
      };
      const actual = currentProfileReducer(start, {
        type: PROFILE_ACTIONS.UPDATE,
        profile: {},
        errors: {
          ...start.errors,
          billingMatchesShipping: true,
        },
      });
      expect(actual).toEqual({
        ...start,
        errors: {
          profileName: true,
          billingMatchesShipping: true,
        },
      });
    });
  });

  describe('should handle load action', () => {
    test('when valid profile is given', () => {
      const expected = {
        ...initialProfileStates.profile,
        id: null,
        editId: 2,
        profileName: 'testing',
      };
      const actual = currentProfileReducer(initialProfileStates.profile, {
        type: PROFILE_ACTIONS.LOAD,
        profile: {
          ...initialProfileStates.profile,
          id: 2,
          profileName: 'testing',
        },
      });
      expect(actual).toEqual(expected);
    });

    test('when invalid profile is given', () => {
      const start = {
        ...initialProfileStates.profile,
        profileName: 'testing',
      };
      const actual = currentProfileReducer(start, {
        type: PROFILE_ACTIONS.LOAD,
        profile: {},
      });
      expect(actual).toEqual(start);
    });

    test('when profile is not given', () => {
      const start = {
        ...initialProfileStates.profile,
        profileName: 'testing',
      };
      const actual = currentProfileReducer(start, {
        type: PROFILE_ACTIONS.LOAD,
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
      const actual = currentProfileReducer(start, {
        type: PROFILE_ACTIONS.REMOVE,
        id: 1,
      });
      expect(actual).toEqual(initialProfileStates.profile);
    });

    test('when action object is valid with editId matching', () => {
      const start = {
        ...initialProfileStates.profile,
        editId: 1,
        profileName: 'testing',
      };
      const actual = currentProfileReducer(start, {
        type: PROFILE_ACTIONS.REMOVE,
        id: 1,
      });
      expect(actual).toEqual(initialProfileStates.profile);
    });

    test('when action object is valid with id not matching', () => {
      const start = {
        ...initialProfileStates.profile,
        id: 2,
        profileName: 'testing',
      };
      const actual = currentProfileReducer(start, {
        type: PROFILE_ACTIONS.REMOVE,
        id: 1,
      });
      expect(actual).toEqual(start);
    });

    test('when action object is valid with editId not matching', () => {
      const start = {
        ...initialProfileStates.profile,
        editId: 2,
        profileName: 'testing',
      };
      const actual = currentProfileReducer(start, {
        type: PROFILE_ACTIONS.REMOVE,
        id: 1,
      });
      expect(actual).toEqual(start);
    });

    test('when id is not defined', () => {
      const start = {
        ...initialProfileStates.profile,
        id: 1,
        profileName: 'testing',
      };
      const actual = currentProfileReducer(start, {
        type: PROFILE_ACTIONS.REMOVE,
      });
      expect(actual).toEqual(start);
    });
  });

  describe('should not respond to', () => {
    const _testNoopResponse = type => {
      const actual = currentProfileReducer(initialProfileStates.profile, {
        type,
      });
      expect(actual).toEqual(initialProfileStates.profile);
    };

    test('select action', () => {
      _testNoopResponse(PROFILE_ACTIONS.SELECT);
    });

    test('error action', () => {
      _testNoopResponse(PROFILE_ACTIONS.ERROR);
    });
  });
});
