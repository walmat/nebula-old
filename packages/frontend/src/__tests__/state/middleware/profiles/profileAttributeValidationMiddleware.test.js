/* global describe expect it test jest beforeEach */
import profileAttributeValidationMiddleware from '../../../../state/middleware/profiles/profileAttributeValidationMiddleware';
import {
  PROFILE_ACTIONS,
  PROFILE_FIELDS,
  PAYMENT_FIELDS,
  LOCATION_FIELDS,
  mapProfileFieldToKey,
} from '../../../../state/actions';
import { initialProfileStates } from '../../../../utils/definitions/profileDefinitions';

describe('profile attribute validation middleware', () => {
  const create = () => {
    const store = {
      getState: jest.fn(() => {}),
      dispatch: jest.fn(),
    };
    const next = jest.fn();

    const invoke = action =>
      profileAttributeValidationMiddleware(store)(next)(action);

    return { store, next, invoke };
  };

  it('should pass through thunks', () => {
    const { next, invoke } = create();
    const thunk = jest.fn();
    invoke(thunk);
    expect(thunk).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(thunk);
  });

  it('should pass through actions without type', () => {
    const { store, next, invoke } = create();
    const action = {};
    invoke(action);
    expect(next).toHaveBeenCalledWith(action);
    expect(store.getState).not.toHaveBeenCalled();
  });

  it("should pass through actions that aren't a profile edit type", () => {
    const { store, next, invoke } = create();
    const action = { type: 'NOT_A_PROFILE_ACTION' };
    invoke(action);
    expect(next).toHaveBeenCalledWith(action);
    expect(store.getState).not.toHaveBeenCalled();
    const nextAction = next.mock.calls[0][0];
    expect(nextAction.errors).not.toBeDefined();
  });

  it('should pass through edit actions that specify a profile with none found', () => {
    const { store, next, invoke } = create();
    store.getState = jest.fn(() => ({
      currentProfile: {
        ...initialProfileStates.profile,
        id: null,
      },
      profiles: [
        {
          ...initialProfileStates.profile,
          id: 1,
        },
        {
          ...initialProfileStates.profile,
          id: 2,
        },
      ],
    }));
    const action = { type: PROFILE_ACTIONS.EDIT, id: 3 };
    invoke(action);
    expect(next).toHaveBeenCalledWith(action);
    expect(store.getState).toHaveBeenCalled();
    const nextAction = next.mock.calls[0][0];
    expect(nextAction.errors).not.toBeDefined();
  });

  describe('should pass through edit actions that are malformed due to', () => {
    const getAction = payload => ({
      type: PROFILE_ACTIONS.EDIT,
      id: null,
      ...payload,
    });

    const testNoop = payload => {
      const { store, next, invoke } = create();
      store.getState = jest.fn(() => ({
        currentProfile: {
          ...initialProfileStates.profile,
          id: null,
        },
      }));
      const action = getAction(payload);
      invoke(action);
      expect(next).not.toHaveBeenCalled();
      expect(store.getState).toHaveBeenCalled();
      expect(store.dispatch).toHaveBeenCalled();
      const nextAction = store.dispatch.mock.calls[0][0];
      expect(nextAction.action).toBe(PROFILE_ACTIONS.EDIT);
      expect(nextAction.type).toBe(PROFILE_ACTIONS.ERROR);
    };

    const testNoopSubfield = subField => {
      test('for edit payment', () =>
        testNoop({
          field: PROFILE_FIELDS.EDIT_PAYMENT,
          value: 'test',
          subField,
        }));

      test('for edit shipping', () =>
        testNoop({
          field: PROFILE_FIELDS.EDIT_SHIPPING,
          value: 'test',
          subField,
        }));

      test('for edit billing', () =>
        testNoop({
          field: PROFILE_FIELDS.EDIT_BILLING,
          value: 'test',
          subField,
        }));
    };

    test('null field given', () =>
      testNoop({
        field: null,
        value: 'test',
      }));

    test('no field given', () =>
      testNoop({
        value: 'test',
      }));

    test('null value given', () =>
      testNoop({
        field: PROFILE_FIELDS.EDIT_NAME,
        value: null,
      }));

    test('no value given', () => testNoop({}));

    describe('sub field is null', () => testNoopSubfield(null));

    describe('sub field is not given', () => testNoopSubfield(undefined));
  });

  const performErrorInjectionTest = ({ action, expectedAction }) => {
    const { store, next, invoke } = create();
    store.getState = jest.fn(() => ({
      currentProfile: {
        ...initialProfileStates.profile,
        id: null,
      },
      profiles: [
        {
          ...initialProfileStates.profile,
          id: 1,
        },
      ],
    }));
    invoke(action);
    expect(next).toHaveBeenCalledWith(expectedAction);
    expect(store.getState).toHaveBeenCalled();
  };

  const generateActions = (id, field, value, valid) => ({
    id,
    action: {
      type: PROFILE_ACTIONS.EDIT,
      id,
      field,
      value,
    },
    expectedAction: {
      type: PROFILE_ACTIONS.EDIT,
      id,
      field,
      value,
      errors: {
        ...initialProfileStates.profile.errors,
        [mapProfileFieldToKey[field]]: !valid,
      },
    },
  });

  const generateSubFieldActions = (id, field, subField, value, valid) => {
    const defaultErrors =
      field === PROFILE_FIELDS.EDIT_PAYMENT
        ? initialProfileStates.paymentErrors
        : initialProfileStates.locationErrors;
    return {
      id,
      action: {
        type: PROFILE_ACTIONS.EDIT,
        id,
        field,
        value,
        subField,
      },
      expectedAction: {
        type: PROFILE_ACTIONS.EDIT,
        id,
        field,
        value,
        subField,
        errors: {
          ...defaultErrors,
          [subField]: !valid,
        },
      },
    };
  };

  const testAllFields = id => {
    const testInjection = actionObject =>
      performErrorInjectionTest(actionObject);
    const getActions = (field, value, valid) =>
      generateActions(id, field, value, valid);
    const getSubFieldActions = (field, subField, value, valid) =>
      generateSubFieldActions(id, field, subField, value, valid);

    describe('should inject errors map on', () => {
      describe('edit name field', () => {
        test('when valid', () =>
          testInjection(getActions(PROFILE_FIELDS.EDIT_NAME, 'test', true)));
        test('when invalid', () =>
          testInjection(getActions(PROFILE_FIELDS.EDIT_NAME, '', false)));
      });

      test('edit billing matches shipping', () =>
        testInjection(
          getActions(PROFILE_FIELDS.EDIT_BILLING_MATCHES_SHIPPING, true, true)
        ));
      test('toggle billing matches shipping', () =>
        testInjection(
          getActions(PROFILE_FIELDS.TOGGLE_BILLING_MATCHES_SHIPPING, true, true)
        ));

      describe('edit payment', () => {
        const testWithField = (subField, value, valid) =>
          testInjection(
            getSubFieldActions(
              PROFILE_FIELDS.EDIT_PAYMENT,
              subField,
              value,
              valid
            )
          );
        describe('email field', () => {
          const testWith = (value, valid) =>
            testWithField(PAYMENT_FIELDS.EMAIL, value, valid);
          test('when valid', () => testWith('test@me.com', true));
          test('when invalid', () => testWith('invalid', false));
        });

        describe('card number field', () => {
          const testWith = (value, valid) =>
            testWithField(PAYMENT_FIELDS.CARD_NUMBER, value, valid);
          test('when valid', () => testWith('4111111111111', true));
          test('when invalid', () => testWith('invalid', false));
        });

        describe('exp field', () => {
          const testWith = (value, valid) =>
            testWithField(PAYMENT_FIELDS.EXP, value, valid);
          test('when valid', () => testWith('12/34', true));
          test('when invalid', () => testWith('invalid', false));
        });

        describe('cvv field', () => {
          const testWith = (value, valid) =>
            testWithField(PAYMENT_FIELDS.CVV, value, valid);
          test('when valid', () => testWith('123', true));
          test('when invalid', () => testWith('invalid', false));
        });
      });

      describe('edit billing', () => {
        const testWithField = (subField, value, valid) =>
          testInjection(
            getSubFieldActions(
              PROFILE_FIELDS.EDIT_BILLING,
              subField,
              value,
              valid
            )
          );
        describe('first name field', () => {
          const testWith = (value, valid) =>
            testWithField(LOCATION_FIELDS.FIRST_NAME, value, valid);
          test('when valid', () => testWith('test', true));
          test('when invalid', () => testWith('', false));
        });

        describe('last name field', () => {
          const testWith = (value, valid) =>
            testWithField(LOCATION_FIELDS.LAST_NAME, value, valid);
          test('when valid', () => testWith('test', true));
          test('when invalid', () => testWith('', false));
        });

        describe('address field', () => {
          const testWith = (value, valid) =>
            testWithField(LOCATION_FIELDS.ADDRESS, value, valid);
          test('when valid', () => testWith('test', true));
          test('when invalid', () => testWith('', false));
        });

        describe('apt field', () => {
          const testWith = (value, valid) =>
            testWithField(LOCATION_FIELDS.APT, value, valid);
          test('when valid', () => testWith('test', true));
        });

        describe('city field', () => {
          const testWith = (value, valid) =>
            testWithField(LOCATION_FIELDS.CITY, value, valid);
          test('when valid', () => testWith('test', true));
          test('when invalid', () => testWith('', false));
        });

        describe('zip code field', () => {
          const testWith = (value, valid) =>
            testWithField(LOCATION_FIELDS.ZIP_CODE, value, valid);
          test('when valid', () => testWith('12345', true));
          test('when invalid', () => testWith('', false));
        });

        describe('phone field', () => {
          const testWith = (value, valid) =>
            testWithField(LOCATION_FIELDS.PHONE_NUMBER, value, valid);
          test('when valid', () => testWith('+1 123 456 7890', true));
          test('when invalid', () => testWith('invalid', false));
        });

        describe('country field', () => {
          const testWith = (value, valid) =>
            testWithField(LOCATION_FIELDS.COUNTRY, value, valid);
          test('when valid', () =>
            testWith({ value: 'US', label: 'United States' }, true));
          test('when invalid', () => testWith('invalid', false));
        });

        describe('state field', () => {
          const testWith = (value, valid) =>
            testWithField(LOCATION_FIELDS.STATE, value, valid);
          test('when valid', () =>
            testWith({ label: 'Puerto Rico', value: 'PR' }, true));
          test('when invalid', () => testWith('invalid', false));
        });
      });

      describe('edit shipping', () => {
        const testWithField = (subField, value, valid) =>
          testInjection(
            getSubFieldActions(
              PROFILE_FIELDS.EDIT_SHIPPING,
              subField,
              value,
              valid
            )
          );
        describe('first name field', () => {
          const testWith = (value, valid) =>
            testWithField(LOCATION_FIELDS.FIRST_NAME, value, valid);
          test('when valid', () => testWith('test', true));
          test('when invalid', () => testWith('', false));
        });

        describe('last name field', () => {
          const testWith = (value, valid) =>
            testWithField(LOCATION_FIELDS.LAST_NAME, value, valid);
          test('when valid', () => testWith('test', true));
          test('when invalid', () => testWith('', false));
        });

        describe('address field', () => {
          const testWith = (value, valid) =>
            testWithField(LOCATION_FIELDS.ADDRESS, value, valid);
          test('when valid', () => testWith('test', true));
          test('when invalid', () => testWith('', false));
        });

        describe('apt field', () => {
          const testWith = (value, valid) =>
            testWithField(LOCATION_FIELDS.APT, value, valid);
          test('when valid', () => testWith('test', true));
        });

        describe('city field', () => {
          const testWith = (value, valid) =>
            testWithField(LOCATION_FIELDS.CITY, value, valid);
          test('when valid', () => testWith('test', true));
          test('when invalid', () => testWith('', false));
        });

        describe('zip code field', () => {
          const testWith = (value, valid) =>
            testWithField(LOCATION_FIELDS.ZIP_CODE, value, valid);
          test('when valid', () => testWith('12345', true));
          test('when invalid', () => testWith('', false));
        });

        describe('phone field', () => {
          const testWith = (value, valid) =>
            testWithField(LOCATION_FIELDS.PHONE_NUMBER, value, valid);
          test('when valid', () => testWith('+1 123 456 7890', true));
          test('when invalid', () => testWith('invalid', false));
        });

        describe('country field', () => {
          const testWith = (value, valid) =>
            testWithField(LOCATION_FIELDS.COUNTRY, value, valid);
          test('when valid', () =>
            testWith({ value: 'US', label: 'United States' }, true));
          test('when invalid', () => testWith('invalid', false));
        });

        describe('state field', () => {
          const testWith = (value, valid) =>
            testWithField(LOCATION_FIELDS.STATE, value, valid);
          test('when valid', () =>
            testWith({ label: 'Puerto Rico', value: 'PR' }, true));
          test('when invalid', () => testWith('invalid', false));
        });
      });
    });
  };

  describe('for current profile', () => {
    testAllFields(null);
  });

  describe('for profile in list', () => {
    testAllFields(1);
  });
});
