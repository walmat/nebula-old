/* eslint-disable no-nested-ternary */
/* global describe expect it test jest beforeEach */
import shippingFormValidationMiddleware from '../../../../state/middleware/settings/shippingFormValidationMiddleware';
import {
  SETTINGS_ACTIONS,
  SETTINGS_FIELDS,
  mapSettingsFieldToKey,
} from '../../../../state/actions';
import { initialSettingsStates } from '../../../../utils/definitions/settingsDefinitions';
import { initialProfileStates } from '../../../../utils/definitions/profileDefinitions';

describe('task form validation middleware', () => {
  const create = () => {
    const store = {
      getState: jest.fn(() => {}),
      dispatch: jest.fn(),
    };
    const next = jest.fn();

    const invoke = action => shippingFormValidationMiddleware(store)(next)(action);

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

  it("should pass through actions that aren't a fetch shipping type", () => {
    const { store, next, invoke } = create();
    const action = { type: 'NOT_A_FETCH_SHIPPING_TYPE' };
    invoke(action);
    expect(next).toHaveBeenCalledWith(action);
    expect(store.getState).not.toHaveBeenCalled();
    const nextAction = next.mock.calls[0][0];
    expect(nextAction.errors).not.toBeDefined();
  });

  describe('should dispatch errors for actions that are malformed', () => {
    const getAction = payload => ({
      ...payload,
    });

    const testNoop = payload => {
      const { store, next, invoke } = create();
      store.getState = jest.fn(() => ({
        shipping: {
          ...initialSettingsStates.shipping,
        },
      }));
      const action = getAction(payload);
      invoke(action);
      expect(next).not.toHaveBeenCalled();
      expect(store.dispatch).toHaveBeenCalled();
      const nextAction = store.dispatch.mock.calls[0][0];
      expect(nextAction.action).toBe(payload.type);
      expect(nextAction.type).toBe(SETTINGS_ACTIONS.ERROR);
    };

    test('null response given on fetch', () => {
      testNoop({
        type: SETTINGS_ACTIONS.FETCH_SHIPPING,
        response: null,
      });
    });

    test('no response given on fetch', () => {
      testNoop({
        type: SETTINGS_ACTIONS.FETCH_SHIPPING,
      });
    });

    describe('no response shipping given', () => {
      testNoop({
        type: SETTINGS_ACTIONS.FETCH_SHIPPING,
        response: {
          shipping: null,
        },
      });
    });
  });

  const generateActions = (type, field, value, testValid) => {
    const actionBase = {
      shipping: {
        ...initialSettingsStates.shipping,
        name: testValid ? '' : 'test',
        profile: testValid
          ? { ...initialProfileStates.profile }
          : {
              id: '02c4979a-e8ed-4370-82c0-07211b62120b',
              profileName: 'test',
              errors: {
                profileName: false,
                billingMatchesShipping: false,
              },
              billingMatchesShipping: true,
              shipping: {
                firstName: 'matt',
                lastName: 'wall',
                address: '131411 oak park blvd',
                apt: '',
                city: 'oak park',
                country: {
                  value: 'US',
                  label: 'United States',
                },
                province: {
                  value: 'MI',
                  label: 'Michigan',
                },
                zipCode: '48237',
                phone: '5157206516',
                errors: {
                  firstName: false,
                  lastName: false,
                  address: false,
                  apt: false,
                  city: false,
                  country: false,
                  province: false,
                  zipCode: false,
                  phone: false,
                },
              },
              billing: {
                firstName: 'matt',
                lastName: 'wall',
                address: '131411 oak park blvd',
                apt: '',
                city: 'oak park',
                country: {
                  value: 'US',
                  label: 'United States',
                },
                province: {
                  value: 'MI',
                  label: 'Michigan',
                },
                zipCode: '48237',
                phone: '5157206516',
                errors: {
                  firstName: false,
                  lastName: false,
                  address: false,
                  apt: false,
                  city: false,
                  country: false,
                  province: false,
                  zipCode: false,
                  phone: false,
                },
              },
              payment: {
                email: 'test@test.com',
                cardNumber: '4242424242424242',
                exp: '04/21',
                cvv: '168',
                errors: {
                  email: false,
                  cardNumber: false,
                  exp: false,
                  cvv: false,
                },
              },
              rates: [
                {
                  site: {
                    name: 'Kith',
                    url: 'https://kith.com',
                  },
                  rates: [
                    {
                      name: '5-7 Business Days',
                      rate: 'shopify-UPS%20GROUND%20(5-7%20business%20days)-10.00',
                    },
                  ],
                  selectedRate: null,
                },
                {
                  site: {
                    name: '12 AM RUN',
                    url: 'https://12amrun.com',
                  },
                  rates: [
                    {
                      name: 'Small Goods Shipping',
                      rate: 'shopify-Small%20Goods%20Shipping-7.00',
                    },
                  ],
                  selectedRate: null,
                },
              ],
              selectedSite: null,
              editId: '02c4979a-e8ed-4370-82c0-07211b62120b',
            },
        site: testValid
          ? {
              ...initialSettingsStates.shipping.site,
              name: '',
            }
          : {
              name: 'Nebula Bots',
              url: 'https://nebulabots.com',
              apiKey: '6526a5b5393b6316a64853cfe091841c',
              localCheckout: false,
              special: false,
              auth: false,
            },
        product: testValid
          ? {
              ...initialSettingsStates.shipping.product,
              raw: 'https',
            }
          : {
              ...initialSettingsStates.shipping.product,
              raw: '+test',
            },
        username: testValid ? '' : 'test',
        password: testValid ? '' : 'test',
      },
    };

    const expectedActionBase = {
      ...actionBase,
      shipping: {
        ...actionBase.shipping,
        errors: {
          ...actionBase.shipping.errors,
          product: testValid,
          site: testValid,
          profile: testValid,
          name: testValid,
          username:
            (field === SETTINGS_FIELDS.EDIT_SHIPPING_SITE && value.auth) ||
            field === SETTINGS_FIELDS.EDIT_SHIPPING_USERNAME
              ? testValid
              : false,
          password:
            (field === SETTINGS_FIELDS.EDIT_SHIPPING_SITE && value.auth) ||
            field === SETTINGS_FIELDS.EDIT_SHIPPING_PASSWORD
              ? testValid
              : false,
        },
      },
    };

    const action = {
      type,
      response: {
        shipping: {
          ...actionBase.shipping,
          [mapSettingsFieldToKey[field]]: value,
        },
      },
    };

    const expectedAction = {
      ...action,
      response: {
        ...expectedActionBase,
        shipping: {
          ...actionBase.shipping,
          ...expectedActionBase.shipping,
          [mapSettingsFieldToKey[field]]: value,
          errors: {
            ...actionBase.shipping.errors,
            ...expectedActionBase.shipping.errors,
            [mapSettingsFieldToKey[field]]: !testValid,
          },
        },
      },
    };

    return {
      action,
      expectedAction,
    };
  };

  const testErrorFlagsForAction = (type, args, genNoErrors) => {
    // get args or mock them if we aren't generating errors
    const { field, value, valid } = !genNoErrors
      ? args
      : {
          value: 'test',
          valid: false,
        };

    const { store, next, invoke } = create();
    const { action, expectedAction } = generateActions(type, field, value, valid);
    if (genNoErrors) {
      // delete expected errors field if we aren't generating errors
      delete expectedAction.errors;
      delete action.response.shipping.undefined;
      delete expectedAction.response.shipping.undefined;
      delete expectedAction.response.shipping.errors.undefined;
    }
    invoke(action);
    expect(store.dispatch).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expectedAction);
  };

  const performErrorFlagTestsForAction = type => {
    const testErrorFlag = args => testErrorFlagsForAction(type, args);

    it('should not generate an errors object if no errors exist', () =>
      testErrorFlagsForAction(type, null, true));

    describe('for field', () => {
      describe('product', () => {
        it('should not generate error flag when valid', () =>
          testErrorFlag({
            field: SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT,
            value: '+test',
            valid: true,
          }));

        it('should generate error flag when invalid', () =>
          testErrorFlag({
            field: SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT,
            value: '',
            valid: false,
          }));
      });

      describe('name', () => {
        it('should not generate error flag when valid', () =>
          testErrorFlag({
            field: SETTINGS_FIELDS.EDIT_SHIPPING_RATE_NAME,
            value: 'test',
            valid: true,
          }));

        it('should generate error flag when invalid', () =>
          testErrorFlag({
            field: SETTINGS_FIELDS.EDIT_SHIPPING_RATE_NAME,
            value: '',
            valid: false,
          }));
      });

      describe('profile', () => {
        it('should not generate error flag when valid', () =>
          testErrorFlag({
            field: SETTINGS_FIELDS.EDIT_SHIPPING_PROFILE,
            value: {
              ...initialProfileStates.profile,
              id: '1',
              profileName: 'test',
              billingMatchesShipping: false,
              payment: {
                email: 'test@me.com',
                cardNumber: '4111111111111',
                exp: '12/34',
                cvv: '123',
              },
              billing: {
                firstName: 'test',
                lastName: 'test',
                address: 'test',
                apt: 'test',
                city: 'test',
                state: { label: 'Puerto Rico', value: 'PR' },
                country: { value: 'US', label: 'United States' },
                zipCode: '12345',
                phone: '1234567890',
              },
              shipping: {
                firstName: 'test',
                lastName: 'test',
                address: 'test',
                apt: 'test',
                city: 'test',
                state: { label: 'Puerto Rico', value: 'PR' },
                country: { value: 'US', label: 'United States' },
                zipCode: '12345',
                phone: '1234567890',
              },
            },
            valid: true,
          }));

        it('should generate error flag when invalid', () =>
          testErrorFlag({
            field: SETTINGS_FIELDS.EDIT_SHIPPING_PROFILE,
            value: {},
            valid: false,
          }));
      });

      describe('site', () => {
        it('should not generate error flag when valid', () =>
          testErrorFlag({
            field: SETTINGS_FIELDS.EDIT_SHIPPING_SITE,
            value: {
              name: '12AM Run',
              url: 'https://12amrun.com',
              apiKey: 'e5b0d0dc103ac126c494f8cc1fd70fe9',
              auth: false,
            },
            valid: true,
          }));

        it('should generate error flag when invalid', () =>
          testErrorFlag({
            field: SETTINGS_FIELDS.EDIT_SHIPPING_SITE,
            value: {},
            valid: false,
          }));
      });

      describe('username', () => {
        it('should not generate error flag when valid', () =>
          testErrorFlag({
            field: SETTINGS_FIELDS.EDIT_SHIPPING_USERNAME,
            value: 'test',
            valid: true,
          }));

        it('should generate error flag when invalid', () =>
          testErrorFlag({
            field: SETTINGS_FIELDS.EDIT_SHIPPING_USERNAME,
            value: '',
            valid: false,
          }));
      });

      describe('password', () => {
        it('should not generate error flag when valid', () =>
          testErrorFlag({
            field: SETTINGS_FIELDS.EDIT_SHIPPING_PASSWORD,
            value: 'test',
            valid: true,
          }));

        it('should generate error flag when invalid', () =>
          testErrorFlag({
            field: SETTINGS_FIELDS.EDIT_SHIPPING_PASSWORD,
            value: '',
            valid: false,
          }));
      });
    });
  };

  describe('for fetch action', () => {
    performErrorFlagTestsForAction(SETTINGS_ACTIONS.FETCH_SHIPPING);
  });
});
