/* global describe it expect test */
import { profileReducer } from '../../../../state/reducers/profiles/profileReducer';
import initialProfileStates from '../../../../state/initial/profiles';
import {
  mapProfileFieldToKey,
  mapRateFieldToKey,
  mapLocationFieldToKey,
  mapPaymentFieldToKey,
  PROFILE_ACTIONS,
  LOCATION_FIELDS,
  PAYMENT_FIELDS,
  PROFILE_FIELDS,
  RATES_FIELDS,
} from '../../../../state/actions';

describe('profile reducer', () => {
  it('should return initial state', () => {
    const actual = profileReducer(undefined, {});
    expect(actual).toEqual(initialProfileStates.profile);
  });

  describe('should handle an edit', () => {
    const checkFieldEdit = ({ message, field, subField, initialFieldState, value }) => {
      test(`${message} when valid`, () => {
        const expected = {
          ...initialProfileStates.profile,
          [mapProfileFieldToKey[field]]: {
            ...initialFieldState,
            [mapLocationFieldToKey[subField] ||
            mapRateFieldToKey[subField] ||
            mapPaymentFieldToKey[subField]]:
              subField === LOCATION_FIELDS.PROVINCE ? value.province : value,
          },
        };
        const actual = profileReducer(initialProfileStates.profile, {
          type: PROFILE_ACTIONS.EDIT,
          field,
          value,
          subField,
        });
        expect(actual).toEqual(expected);
      });

      test(`${message} when empty`, () => {
        const expected = {
          ...initialProfileStates.profile,
          [mapProfileFieldToKey[field]]: {
            ...initialFieldState,
          },
        };
        const actual = profileReducer(initialProfileStates.profile, {
          type: PROFILE_ACTIONS.EDIT,
          field,
          value: '',
          subField,
        });
        expect(actual).toEqual(expected);
      });

      test(`${message} when null`, () => {
        const expected = {
          ...initialProfileStates.profile,
          [mapProfileFieldToKey[field]]: {
            ...initialFieldState,
          },
        };
        const actual = profileReducer(initialProfileStates.profile, {
          type: PROFILE_ACTIONS.EDIT,
          field,
          value: null,
          subField,
        });
        expect(actual).toEqual(expected);
      });
    };

    test('action when field is invalid', () => {
      const actual = profileReducer(initialProfileStates.profile, {
        type: PROFILE_ACTIONS.EDIT,
        field: 'INVALID',
        value: 'invalid',
        subField: 'INVALID',
      });
      expect(actual).toEqual(initialProfileStates.profile);
    });

    describe('shipping', () => {
      checkFieldEdit({
        message: 'first name action',
        field: PROFILE_FIELDS.EDIT_SHIPPING,
        subField: LOCATION_FIELDS.FIRST_NAME,
        value: 'testing',
        initialFieldState: initialProfileStates.location,
      });

      checkFieldEdit({
        message: 'last name action',
        field: PROFILE_FIELDS.EDIT_SHIPPING,
        subField: LOCATION_FIELDS.LAST_NAME,
        value: 'testing',
        initialFieldState: initialProfileStates.location,
      });

      checkFieldEdit({
        message: 'address action',
        field: PROFILE_FIELDS.EDIT_SHIPPING,
        subField: LOCATION_FIELDS.ADDRESS,
        value: 'testing',
        initialFieldState: initialProfileStates.location,
      });

      checkFieldEdit({
        message: 'apt action',
        field: PROFILE_FIELDS.EDIT_SHIPPING,
        subField: LOCATION_FIELDS.APT,
        value: 'testing',
        initialFieldState: initialProfileStates.location,
      });

      checkFieldEdit({
        message: 'city action',
        field: PROFILE_FIELDS.EDIT_SHIPPING,
        subField: LOCATION_FIELDS.CITY,
        value: 'testing',
        initialFieldState: initialProfileStates.location,
      });

      checkFieldEdit({
        message: 'zipCode action',
        field: PROFILE_FIELDS.EDIT_SHIPPING,
        subField: LOCATION_FIELDS.ZIP_CODE,
        value: 'testing',
        initialFieldState: initialProfileStates.location,
      });

      checkFieldEdit({
        message: 'phone action',
        field: PROFILE_FIELDS.EDIT_SHIPPING,
        subField: LOCATION_FIELDS.PHONE_NUMBER,
        value: 'testing',
        initialFieldState: initialProfileStates.location,
      });

      checkFieldEdit({
        message: 'country action',
        field: PROFILE_FIELDS.EDIT_SHIPPING,
        subField: LOCATION_FIELDS.COUNTRY,
        value: 'testing',
        initialFieldState: initialProfileStates.location,
      });

      checkFieldEdit({
        message: 'province action',
        field: PROFILE_FIELDS.EDIT_SHIPPING,
        subField: LOCATION_FIELDS.PROVINCE,
        value: {
          province: { value: 'AL', label: 'Alabama' },
          country: { value: 'US', label: 'United States' },
        },
        initialFieldState: initialProfileStates.location,
      });

      test('action when subField is invalid', () => {
        const actual = profileReducer(initialProfileStates.profile, {
          type: PROFILE_ACTIONS.EDIT,
          field: PROFILE_FIELDS.EDIT_SHIPPING,
          value: 'invalid',
          subField: 'INVALID',
        });
        expect(actual).toEqual(initialProfileStates.profile);
      });

      test('action when errors object is present', () => {
        const expected = {
          ...initialProfileStates.profile,
          shipping: {
            ...initialProfileStates.location,
            firstName: 'testing',
            errors: 'testing',
          },
        };
        const actual = profileReducer(initialProfileStates.profile, {
          type: PROFILE_ACTIONS.EDIT,
          field: PROFILE_FIELDS.EDIT_SHIPPING,
          value: 'testing',
          subField: LOCATION_FIELDS.FIRST_NAME,
          errors: 'testing',
        });
        expect(actual).toEqual(expected);
      });
    });

    describe('billing', () => {
      checkFieldEdit({
        message: 'first name action',
        field: PROFILE_FIELDS.EDIT_BILLING,
        subField: LOCATION_FIELDS.FIRST_NAME,
        value: 'testing',
        initialFieldState: initialProfileStates.location,
      });

      checkFieldEdit({
        message: 'last name action',
        field: PROFILE_FIELDS.EDIT_BILLING,
        subField: LOCATION_FIELDS.LAST_NAME,
        value: 'testing',
        initialFieldState: initialProfileStates.location,
      });

      checkFieldEdit({
        message: 'address action',
        field: PROFILE_FIELDS.EDIT_BILLING,
        subField: LOCATION_FIELDS.ADDRESS,
        value: 'testing',
        initialFieldState: initialProfileStates.location,
      });

      checkFieldEdit({
        message: 'apt action',
        field: PROFILE_FIELDS.EDIT_BILLING,
        subField: LOCATION_FIELDS.APT,
        value: 'testing',
        initialFieldState: initialProfileStates.location,
      });

      checkFieldEdit({
        message: 'city action',
        field: PROFILE_FIELDS.EDIT_BILLING,
        subField: LOCATION_FIELDS.CITY,
        value: 'testing',
        initialFieldState: initialProfileStates.location,
      });

      checkFieldEdit({
        message: 'zipCode action',
        field: PROFILE_FIELDS.EDIT_BILLING,
        subField: LOCATION_FIELDS.ZIP_CODE,
        value: 'testing',
        initialFieldState: initialProfileStates.location,
      });

      checkFieldEdit({
        message: 'phone action',
        field: PROFILE_FIELDS.EDIT_BILLING,
        subField: LOCATION_FIELDS.PHONE_NUMBER,
        value: 'testing',
        initialFieldState: initialProfileStates.location,
      });

      checkFieldEdit({
        message: 'country action',
        field: PROFILE_FIELDS.EDIT_BILLING,
        subField: LOCATION_FIELDS.COUNTRY,
        value: 'testing',
        initialFieldState: initialProfileStates.location,
      });

      checkFieldEdit({
        message: 'province action',
        field: PROFILE_FIELDS.EDIT_BILLING,
        subField: LOCATION_FIELDS.PROVINCE,
        value: {
          province: { value: 'AL', label: 'Alabama' },
          country: { value: 'US', label: 'United States' },
        },
        initialFieldState: initialProfileStates.location,
      });

      test('action when subField is invalid', () => {
        const actual = profileReducer(initialProfileStates.profile, {
          type: PROFILE_ACTIONS.EDIT,
          field: PROFILE_FIELDS.EDIT_BILLING,
          value: 'invalid',
          subField: 'INVALID',
        });
        expect(actual).toEqual(initialProfileStates.profile);
      });

      test('action when errors object is present', () => {
        const expected = {
          ...initialProfileStates.profile,
          billing: {
            ...initialProfileStates.location,
            firstName: 'testing',
            errors: 'testing',
          },
        };
        const actual = profileReducer(initialProfileStates.profile, {
          type: PROFILE_ACTIONS.EDIT,
          field: PROFILE_FIELDS.EDIT_BILLING,
          value: 'testing',
          subField: LOCATION_FIELDS.FIRST_NAME,
          errors: 'testing',
        });
        expect(actual).toEqual(expected);
      });
    });

    describe('payment', () => {
      checkFieldEdit({
        message: 'email action',
        field: PROFILE_FIELDS.EDIT_PAYMENT,
        subField: PAYMENT_FIELDS.EMAIL,
        value: 'testing',
        initialFieldState: initialProfileStates.payment,
      });

      checkFieldEdit({
        message: 'card number action',
        field: PROFILE_FIELDS.EDIT_PAYMENT,
        subField: PAYMENT_FIELDS.CARD_NUMBER,
        value: 'testing',
        initialFieldState: initialProfileStates.payment,
      });

      checkFieldEdit({
        message: 'exp action',
        field: PROFILE_FIELDS.EDIT_PAYMENT,
        subField: PAYMENT_FIELDS.EXP,
        value: 'testing',
        initialFieldState: initialProfileStates.payment,
      });

      checkFieldEdit({
        message: 'cvv action',
        field: PROFILE_FIELDS.EDIT_PAYMENT,
        subField: PAYMENT_FIELDS.CVV,
        value: 'testing',
        initialFieldState: initialProfileStates.payment,
      });

      test('action when subField is invalid', () => {
        const actual = profileReducer(initialProfileStates.profile, {
          type: PROFILE_ACTIONS.EDIT,
          field: PROFILE_FIELDS.EDIT_PAYMENT,
          value: 'invalid',
          subField: 'INVALID',
        });
        expect(actual).toEqual(initialProfileStates.profile);
      });

      test('action when errors object is present', () => {
        const expected = {
          ...initialProfileStates.profile,
          payment: {
            ...initialProfileStates.payment,
            email: 'testing',
            errors: 'testing',
          },
        };
        const actual = profileReducer(initialProfileStates.profile, {
          type: PROFILE_ACTIONS.EDIT,
          field: PROFILE_FIELDS.EDIT_PAYMENT,
          value: 'testing',
          subField: PAYMENT_FIELDS.EMAIL,
          errors: 'testing',
        });
        expect(actual).toEqual(expected);
      });
    });

    describe('rates', () => {
      test(`when valid site selection`, () => {
        const initial = {
          ...initialProfileStates.profile,
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
        };

        const expected = {
          ...initialProfileStates.profile,
          selectedSite: {
            name: 'Kith',
            url: 'https://kith.com',
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
        };
        const actual = profileReducer(initial, {
          type: PROFILE_ACTIONS.EDIT,
          field: PROFILE_FIELDS.EDIT_SELECTED_SITE,
          subField: RATES_FIELDS.SITE,
          value: {
            name: 'Kith',
            url: 'https://kith.com',
          },
        });
        expect(actual).toEqual(expected);
      });

      test(`when valid rate selection`, () => {
        const initial = {
          ...initialProfileStates.profile,
          selectedSite: {
            name: 'Kith',
            url: 'https://kith.com',
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
        };

        const expected = {
          ...initialProfileStates.profile,
          selectedSite: {
            name: 'Kith',
            url: 'https://kith.com',
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
              selectedRate: {
                name: '5-7 Business Days',
                rate: 'shopify-UPS%20GROUND%20(5-7%20business%20days)-10.00',
              },
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
        };
        const actual = profileReducer(initial, {
          type: PROFILE_ACTIONS.EDIT,
          field: PROFILE_FIELDS.EDIT_RATES,
          subField: RATES_FIELDS.RATE,
          value: {
            site: {
              value: 'https://kith.com',
              label: 'Kith',
            },
            rate: {
              name: '5-7 Business Days',
              rate: 'shopify-UPS%20GROUND%20(5-7%20business%20days)-10.00',
            },
          },
        });
        expect(actual).toEqual(expected);
      });
    });

    test('billing matches shipping action', () => {
      const start = {
        ...initialProfileStates.profile,
        billingMatchesShipping: true,
      };
      const expected1 = {
        ...initialProfileStates.profile,
        billingMatchesShipping: false,
      };
      const actual1 = profileReducer(initialProfileStates.profile, {
        type: PROFILE_ACTIONS.EDIT,
        field: PROFILE_FIELDS.EDIT_BILLING_MATCHES_SHIPPING,
        value: false,
      });
      expect(actual1).toEqual(expected1);
      const actual2 = profileReducer(expected1, {
        type: PROFILE_ACTIONS.EDIT,
        field: PROFILE_FIELDS.EDIT_BILLING_MATCHES_SHIPPING,
        value: true,
      });
      expect(actual2).toEqual(start);
    });

    test('billing matches shipping action when toggling', () => {
      const start = {
        ...initialProfileStates.profile,
        billingMatchesShipping: true,
      };
      const expected1 = {
        ...initialProfileStates.profile,
        billingMatchesShipping: false,
      };
      const actual1 = profileReducer(start, {
        type: PROFILE_ACTIONS.EDIT,
        field: PROFILE_FIELDS.TOGGLE_BILLING_MATCHES_SHIPPING,
      });
      expect(actual1).toEqual(expected1);
      const actual2 = profileReducer(expected1, {
        type: PROFILE_ACTIONS.EDIT,
        field: PROFILE_FIELDS.TOGGLE_BILLING_MATCHES_SHIPPING,
      });
      expect(actual2).toEqual(start);
    });

    describe('name action', () => {
      test('when valid', () => {
        const expected = {
          ...initialProfileStates.profile,
          profileName: 'testing',
        };
        const actual = profileReducer(initialProfileStates.profile, {
          type: PROFILE_ACTIONS.EDIT,
          field: PROFILE_FIELDS.EDIT_NAME,
          value: 'testing',
        });
        expect(actual).toEqual(expected);
      });

      test('when empty', () => {
        const expected = {
          ...initialProfileStates.profile,
          profileName: '',
        };
        const actual = profileReducer(initialProfileStates.profile, {
          type: PROFILE_ACTIONS.EDIT,
          field: PROFILE_FIELDS.EDIT_NAME,
          value: '',
        });
        expect(actual).toEqual(expected);
      });

      test('when null', () => {
        const expected = {
          ...initialProfileStates.profile,
          profileName: '',
        };
        const actual = profileReducer(initialProfileStates.profile, {
          type: PROFILE_ACTIONS.EDIT,
          field: PROFILE_FIELDS.EDIT_NAME,
          value: null,
        });
        expect(actual).toEqual(expected);
      });
    });
  });

  describe('should not respond to', () => {
    const _testNoopResponse = type => {
      const actual = profileReducer(initialProfileStates.profile, { type });
      expect(actual).toEqual(initialProfileStates.profile);
    };

    test('add action', () => {
      _testNoopResponse(PROFILE_ACTIONS.ADD);
    });

    test('remove action', () => {
      _testNoopResponse(PROFILE_ACTIONS.REMOVE);
    });

    test('select action', () => {
      _testNoopResponse(PROFILE_ACTIONS.SELECT);
    });

    test('load action', () => {
      _testNoopResponse(PROFILE_ACTIONS.LOAD);
    });

    test('update action', () => {
      _testNoopResponse(PROFILE_ACTIONS.UPDATE);
    });

    test('error action', () => {
      _testNoopResponse(PROFILE_ACTIONS.ERROR);
    });
  });
});
