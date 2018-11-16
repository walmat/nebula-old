/* global describe expect it test jest beforeEach */
import profileFormValidationMiddleware from '../../../../state/middleware/profiles/profileFormValidationMiddleware';
import {
  PROFILE_ACTIONS,
  PROFILE_FIELDS,
  PAYMENT_FIELDS,
  LOCATION_FIELDS,
  mapProfileFieldToKey,
} from '../../../../state/actions';
import { initialProfileStates } from '../../../../utils/definitions/profileDefinitions';

describe('profile form validation middleware', () => {
  const create = () => {
    const store = {
      getState: jest.fn(() => {}),
      dispatch: jest.fn(),
    };
    const next = jest.fn();

    const invoke = action =>
      profileFormValidationMiddleware(store)(next)(action);

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

  it("should pass through actions that aren't a profile add or update type", () => {
    const { store, next, invoke } = create();
    const action = { type: 'NOT_A_PROFILE_ACTION' };
    invoke(action);
    expect(next).toHaveBeenCalledWith(action);
    expect(store.getState).not.toHaveBeenCalled();
    const nextAction = next.mock.calls[0][0];
    expect(nextAction.errors).not.toBeDefined();
  });

  describe('should dispatch errors for actions that are malformed', () => {
    const getAction = payload => ({
      id: null,
      ...payload,
    });

    const testNoop = (payload) => {
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
      expect(store.dispatch).toHaveBeenCalled();
      const nextAction = store.dispatch.mock.calls[0][0];
      expect(nextAction.action).toBe(payload.type);
      expect(nextAction.type).toBe(PROFILE_ACTIONS.ERROR);
    };

    describe('null profile given', () => {
      test('when type is add', () =>
        testNoop({
          type: PROFILE_ACTIONS.ADD,
          profile: null,
        }));

      test('when type is update', () =>
        testNoop({
          type: PROFILE_ACTIONS.UPDATE,
          profile: null,
        }));
    });

    describe('no profile given', () => {
      test('when type is add', () =>
        testNoop({
          type: PROFILE_ACTIONS.ADD,
        }));

      test('when type is update', () =>
        testNoop({
          type: PROFILE_ACTIONS.UPDATE,
        }));
    });
  });

  const generateActions = (type, field, value, testValid, subField) => {
    const actionBase = {
      type,
      profile: {
        ...initialProfileStates.profile,
        profileName: testValid ? '' : 'test',
        billingMatchesShipping: testValid ? undefined : false,
        payment: {
          ...initialProfileStates.payment,
          email: testValid ? 'invalid' : 'test@me.com',
          cardNumber: testValid ? 'invalid' : '4111111111111',
          exp: testValid ? 'invalid' : '12/34',
          cvv: testValid ? 'invalid' : '123',
        },
        billing: {
          ...initialProfileStates.location,
          firstName: testValid ? '' : 'test',
          lastName: testValid ? '' : 'test',
          address: testValid ? '' : 'test',
          apt: 'test',
          city: testValid ? '' : 'test',
          state: testValid ? 'invalid' : { label: 'Puerto Rico', value: 'PR' },
          country: testValid ? 'invalid' : { value: 'US', label: 'United States' },
          zipCode: testValid ? '' : '12345',
          phone: testValid ? 'invalid' : '1234567890',
        },
        shipping: {
          ...initialProfileStates.location,
          firstName: testValid ? '' : 'test',
          lastName: testValid ? '' : 'test',
          address: testValid ? '' : 'test',
          apt: 'test',
          city: testValid ? '' : 'test',
          state: testValid ? 'invalid' : { label: 'Puerto Rico', value: 'PR' },
          country: testValid ? 'invalid' : { value: 'US', label: 'United States' },
          zipCode: testValid ? '' : '12345',
          phone: testValid ? 'invalid' : '1234567890',
        },
      },
    };
    const expectedActionBase = {
      ...actionBase,
      profile: {
        ...actionBase.profile,
        errors: {
          ...actionBase.profile.errors,
          profileName: testValid,
          billingMatchesShipping: testValid,
        },
        payment: {
          ...actionBase.profile.payment,
          errors: {
            email: testValid,
            cardNumber: testValid,
            exp: testValid,
            cvv: testValid,
          },
        },
        billing: {
          ...actionBase.profile.billing,
          errors: {
            firstName: testValid,
            lastName: testValid,
            address: testValid,
            apt: false,
            city: testValid,
            state: testValid,
            country: testValid,
            zipCode: testValid,
            phone: testValid,
          },
        },
        shipping: {
          ...actionBase.profile.shipping,
          errors: {
            firstName: testValid,
            lastName: testValid,
            address: testValid,
            apt: false,
            city: testValid,
            state: testValid,
            country: testValid,
            zipCode: testValid,
            phone: testValid,
          },
        },
      },
      errors: {
        billing: {
          firstName: testValid,
          lastName: testValid,
          address: testValid,
          apt: false,
          city: testValid,
          state: testValid,
          country: testValid,
          zipCode: testValid,
          phone: testValid,
        },
        shipping: {
          firstName: testValid,
          lastName: testValid,
          address: testValid,
          apt: false,
          city: testValid,
          state: testValid,
          country: testValid,
          zipCode: testValid,
          phone: testValid,
        },
        payment: {
          email: testValid,
          cardNumber: testValid,
          exp: testValid,
          cvv: testValid,
        },
        billingMatchesShipping: testValid,
        profileName: testValid,
      },
    };
    const action = {
      ...actionBase,
      profile: {
        ...actionBase.profile,
        [mapProfileFieldToKey[field]]: !subField
          ? value
          : {
            ...actionBase.profile[mapProfileFieldToKey[field]],
            [subField]: value,
          },
      },
    };
    const expectedAction = {
      ...expectedActionBase,
      ...action,
      profile: {
        ...actionBase.profile,
        ...expectedActionBase.profile,
        [mapProfileFieldToKey[field]]: !subField
          ? value
          : {
            ...action.profile[mapProfileFieldToKey[field]],
            errors: {
              ...expectedActionBase.profile[mapProfileFieldToKey[field]]
                .errors,
              [subField]: !testValid,
            },
          },
      },
      errors: {
        ...expectedActionBase.errors,
        [mapProfileFieldToKey[field]]: !subField
          ? !testValid
          : {
            ...expectedActionBase.errors[mapProfileFieldToKey[field]],
            [subField]: !testValid,
          },
      },
    };
    if (!subField) {
      expectedAction.profile.errors = {
        ...expectedAction.profile.errors,
        [mapProfileFieldToKey[field]]: !testValid,
      };
    }
    return {
      action,
      expectedAction,
    };
  };

  const testErrorFlagsForAction = (type, args, genNoErrors) => {
    // get args or mock them if we aren't generating errors
    const {
      field, value, valid, subField,
    } = !genNoErrors
      ? args
      : {
        value: 'test',
        valid: false,
      };
    const { store, next, invoke } = create();
    const { action, expectedAction } = generateActions(
      type,
      field,
      value,
      valid,
      subField,
    );
    if (genNoErrors) {
      // delete expected errors field if we aren't generating errors
      delete expectedAction.errors;
    }
    invoke(action);
    expect(store.dispatch).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expectedAction);
  };

  const performErrorFlagTestsForAction = (type) => {
    const testErrorFlag = args => testErrorFlagsForAction(type, args);

    it('should not generate an errors object if no errors exist', () =>
      testErrorFlagsForAction(type, null, true));

    describe('for field', () => {
      describe('name', () => {
        it('should not generate error flag when valid', () =>
          testErrorFlag({
            field: PROFILE_FIELDS.EDIT_NAME,
            value: 'test',
            valid: true,
          }));

        it('should generate error flag when invalid', () =>
          testErrorFlag({
            field: PROFILE_FIELDS.EDIT_NAME,
            value: '',
            valid: false,
          }));
      });

      describe('billing matches shipping', () => {
        it('should not generate error flag when valid', () =>
          testErrorFlag({
            field: PROFILE_FIELDS.EDIT_BILLING_MATCHES_SHIPPING,
            value: 'test',
            valid: true,
          }));

        it('should generate error flag when invalid', () =>
          testErrorFlag({
            field: PROFILE_FIELDS.EDIT_BILLING_MATCHES_SHIPPING,
            value: undefined,
            valid: false,
          }));
      });

      describe('billing matches shipping', () =>
        testErrorFlag({
          field: PROFILE_FIELDS.EDIT_BILLING_MATCHES_SHIPPING,
          value: false,
          valid: true,
        }));

      describe('payment', () => {
        const _testErrorFlag = args =>
          testErrorFlag({ ...args, field: PROFILE_FIELDS.EDIT_PAYMENT });

        describe('email', () => {
          it('should not generate error flag when valid', () =>
            _testErrorFlag({
              value: 'test@me.com',
              valid: true,
              subField: PAYMENT_FIELDS.EMAIL,
            }));

          it('should generate error flag when invalid', () =>
            _testErrorFlag({
              value: 'invalid',
              valid: false,
              subField: PAYMENT_FIELDS.EMAIL,
            }));
        });

        describe('card number', () => {
          it('should not generate error flag when valid', () =>
            _testErrorFlag({
              value: '4111111111111',
              valid: true,
              subField: PAYMENT_FIELDS.CARD_NUMBER,
            }));

          it('should generate error flag when invalid', () =>
            _testErrorFlag({
              value: 'invalid',
              valid: false,
              subField: PAYMENT_FIELDS.CARD_NUMBER,
            }));
        });

        describe('exp', () => {
          it('should not generate error flag when valid', () =>
            _testErrorFlag({
              value: '12/34',
              valid: true,
              subField: PAYMENT_FIELDS.EXP,
            }));

          it('should generate error flag when invalid', () =>
            _testErrorFlag({
              value: 'invalid',
              valid: false,
              subField: PAYMENT_FIELDS.EXP,
            }));
        });

        describe('cvv', () => {
          it('should not generate error flag when valid', () =>
            _testErrorFlag({
              value: '123',
              valid: true,
              subField: PAYMENT_FIELDS.CVV,
            }));

          it('should generate error flag when invalid', () =>
            _testErrorFlag({
              value: 'invalid',
              valid: false,
              subField: PAYMENT_FIELDS.CVV,
            }));
        });
      });

      const performLocationErrorFlagTests = (field) => {
        const _testErrorFlag = args => testErrorFlag({ ...args, field });

        describe('first name', () => {
          it('should not generate error flag when valid', () =>
            _testErrorFlag({
              value: 'test',
              valid: true,
              subField: LOCATION_FIELDS.FIRST_NAME,
            }));

          it('should generate error flag when invalid', () =>
            _testErrorFlag({
              value: '',
              valid: false,
              subField: LOCATION_FIELDS.FIRST_NAME,
            }));
        });

        describe('last name', () => {
          it('should not generate error flag when valid', () =>
            _testErrorFlag({
              value: 'test',
              valid: true,
              subField: LOCATION_FIELDS.LAST_NAME,
            }));

          it('should generate error flag when invalid', () =>
            _testErrorFlag({
              value: '',
              valid: false,
              subField: LOCATION_FIELDS.LAST_NAME,
            }));
        });

        describe('address', () => {
          it('should not generate error flag when valid', () =>
            _testErrorFlag({
              value: 'test',
              valid: true,
              subField: LOCATION_FIELDS.ADDRESS,
            }));

          it('should generate error flag when invalid', () =>
            _testErrorFlag({
              value: '',
              valid: false,
              subField: LOCATION_FIELDS.ADDRESS,
            }));
        });

        describe('apt', () => {
          // APT is optional, so there's no need to test invalid case
          it('should not generate error flag when valid', () =>
            _testErrorFlag({
              value: 'test',
              valid: true,
              subField: LOCATION_FIELDS.APT,
            }));
        });

        describe('city', () => {
          it('should not generate error flag when valid', () =>
            _testErrorFlag({
              value: 'test',
              valid: true,
              subField: LOCATION_FIELDS.CITY,
            }));

          it('should generate error flag when invalid', () =>
            _testErrorFlag({
              value: '',
              valid: false,
              subField: LOCATION_FIELDS.CITY,
            }));
        });

        describe('zip code', () => {
          it('should not generate error flag when valid', () =>
            _testErrorFlag({
              value: '12345',
              valid: true,
              subField: LOCATION_FIELDS.ZIP_CODE,
            }));

          it('should generate error flag when invalid', () =>
            _testErrorFlag({
              value: '',
              valid: false,
              subField: LOCATION_FIELDS.ZIP_CODE,
            }));
        });

        describe('phone number', () => {
          it('should not generate error flag when valid', () =>
            _testErrorFlag({
              value: '+1 123 456 7890',
              valid: true,
              subField: LOCATION_FIELDS.PHONE_NUMBER,
            }));

          it('should generate error flag when invalid', () =>
            _testErrorFlag({
              value: 'invalid',
              valid: false,
              subField: LOCATION_FIELDS.PHONE_NUMBER,
            }));
        });

        describe('country', () => {
          it('should not generate error flag when valid', () => _testErrorFlag({
            value: { value: 'US', label: 'United States' }, valid: true, subField: LOCATION_FIELDS.COUNTRY,
          }));

          it('should generate error flag when invalid', () => _testErrorFlag({
            value: 'invalid', valid: false, subField: LOCATION_FIELDS.COUNTRY,
          }));
        });

        describe('state', () => {
          it('should not generate error flag when valid', () => _testErrorFlag({
            value: { label: 'Puerto Rico', value: 'PR' }, valid: true, subField: LOCATION_FIELDS.STATE,
          }));

          it('should generate error flag when invalid', () => _testErrorFlag({
            value: 'invalid', valid: false, subField: LOCATION_FIELDS.STATE,
          }));
        });
      };

      describe('billing', () => {
        performLocationErrorFlagTests(PROFILE_FIELDS.EDIT_BILLING);
      });

      describe('shipping', () => {
        performLocationErrorFlagTests(PROFILE_FIELDS.EDIT_SHIPPING);
      });
    });
  };

  describe('for add action', () => {
    performErrorFlagTestsForAction(PROFILE_ACTIONS.ADD);
  });

  describe('for update action', () => {
    performErrorFlagTestsForAction(PROFILE_ACTIONS.UPDATE);
  });
});
