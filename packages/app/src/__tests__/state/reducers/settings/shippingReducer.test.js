/* global describe it test expect beforeAll */
import shippingReducer from '../../../../state/reducers/settings/shippingReducer';
import { SETTINGS_ACTIONS, SETTINGS_FIELDS } from '../../../../state/actions';
import initialSettingsStates from '../../../../state/initial/settings';
import initialProfileStates from '../../../../state/initial/profiles';

describe('settings reducer', () => {
  it('should return initial state', () => {
    const expected = initialSettingsStates.shipping;
    const actual = shippingReducer(undefined, {});
    expect(actual).toEqual(expected);
  });

  describe('should handle edit', () => {
    describe('shipping product', () => {
      test('when no value is given', () => {
        const expected = {
          ...initialSettingsStates.shipping,
          product: {
            ...initialSettingsStates.shipping.product,
            raw: '',
          },
          errors: {
            ...initialSettingsStates.shipping.errors,
            product: true,
          },
        };
        const actual = shippingReducer(undefined, {
          type: SETTINGS_ACTIONS.EDIT,
          field: SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT,
          value: undefined,
          errors: {
            ...initialSettingsStates.shipping.errors,
            product: true,
          },
        });
        expect(actual).toEqual(expected);
      });

      test('when value is keywords', () => {
        const expected = {
          ...initialSettingsStates.shipping,
          product: {
            ...initialSettingsStates.shipping.product,
            raw: '+test',
          },
        };
        const actual = shippingReducer(undefined, {
          type: SETTINGS_ACTIONS.EDIT,
          field: SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT,
          value: '+test',
          errors: {},
        });
        expect(actual).toEqual(expected);
      });

      test('when value is non-valid URL', () => {
        const expected = {
          ...initialSettingsStates.shipping,
          product: {
            ...initialSettingsStates.shipping.product,
            raw: 'https://',
          },
        };
        const actual = shippingReducer(undefined, {
          type: SETTINGS_ACTIONS.EDIT,
          field: SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT,
          value: 'https://',
          errors: {},
        });
        expect(actual).toEqual(expected);
      });

      test('when value is valid URL in site list', () => {
        const expected = {
          ...initialSettingsStates.shipping,
          product: {
            ...initialSettingsStates.shipping.product,
            raw: 'https://nebulabots.com/products/test',
          },
          site: {
            url: 'https://nebulabots.com',
            name: 'Nebula Bots',
            apiKey: '6526a5b5393b6316a64853cfe091841c',
            special: false,
            auth: false,
          },
          username: '',
          password: '',
        };
        const actual = shippingReducer(undefined, {
          type: SETTINGS_ACTIONS.EDIT,
          field: SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT,
          value: 'https://nebulabots.com/products/test',
          errors: {},
        });
        expect(actual).toEqual(expected);
      });

      test('when value is valid URL not in site list', () => {
        const expected = {
          ...initialSettingsStates.shipping,
          product: {
            ...initialSettingsStates.shipping.product,
            raw: 'https://google.com',
          },
        };
        const actual = shippingReducer(undefined, {
          type: SETTINGS_ACTIONS.EDIT,
          field: SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT,
          value: 'https://google.com',
          errors: {},
        });
        expect(actual).toEqual(expected);
      });
    });

    describe('shipping rate name', () => {
      test('should handle edit', () => {
        const expected = {
          ...initialSettingsStates.shipping,
          name: 'test',
        };
        const actual = shippingReducer(undefined, {
          type: SETTINGS_ACTIONS.EDIT,
          field: SETTINGS_FIELDS.EDIT_SHIPPING_RATE_NAME,
          value: 'test',
        });
        expect(actual).toEqual(expected);
      });

      test('should handle errors', () => {
        const expected = {
          ...initialSettingsStates.shipping,
          name: '',
          errors: {
            ...initialSettingsStates.shipping.errors,
            name: true,
          },
        };
        const actual = shippingReducer(undefined, {
          type: SETTINGS_ACTIONS.EDIT,
          field: SETTINGS_FIELDS.EDIT_SHIPPING_RATE_NAME,
          value: '',
          errors: {
            ...initialSettingsStates.shipping.errors,
            name: true,
          },
        });
        expect(actual).toEqual(expected);
      });
    });

    describe('shipping rate profile', () => {
      test('should handle edit', () => {
        const expected = {
          ...initialSettingsStates.shipping,
          profile: {
            ...initialProfileStates.profile,
            id: 1,
            profileName: 'test',
          },
        };
        const actual = shippingReducer(undefined, {
          type: SETTINGS_ACTIONS.EDIT,
          field: SETTINGS_FIELDS.EDIT_SHIPPING_PROFILE,
          value: { ...initialProfileStates.profile, id: 1, profileName: 'test' },
        });
        expect(actual).toEqual(expected);
      });

      test('should handle errors', () => {
        const expected = {
          ...initialSettingsStates.shipping,
          profile: {},
          errors: {
            ...initialSettingsStates.shipping.errors,
            profile: true,
          },
        };
        const actual = shippingReducer(undefined, {
          type: SETTINGS_ACTIONS.EDIT,
          field: SETTINGS_FIELDS.EDIT_SHIPPING_PROFILE,
          value: {},
          errors: {
            ...initialSettingsStates.shipping.errors,
            profile: true,
          },
        });
        expect(actual).toEqual(expected);
      });
    });

    describe('shipping rate site', () => {
      test('should handle edit', () => {
        const expected = {
          ...initialSettingsStates.shipping,
          site: {
            ...initialProfileStates.site,
            name: 'Nebula Bots',
            url: 'https://nebulabots.com',
            apiKey: '6526a5b5393b6316a64853cfe091841c',
            auth: false,
            supported: true,
          },
        };
        const actual = shippingReducer(undefined, {
          type: SETTINGS_ACTIONS.EDIT,
          field: SETTINGS_FIELDS.EDIT_SHIPPING_SITE,
          value: {
            name: 'Nebula Bots',
            url: 'https://nebulabots.com',
            apiKey: '6526a5b5393b6316a64853cfe091841c',
            auth: false,
            supported: true,
          },
        });
        expect(actual).toEqual(expected);
      });

      test('should handle errors', () => {
        const expected = {
          ...initialSettingsStates.shipping,
          site: {},
          errors: {
            ...initialSettingsStates.shipping.errors,
            site: true,
          },
        };
        const actual = shippingReducer(undefined, {
          type: SETTINGS_ACTIONS.EDIT,
          field: SETTINGS_FIELDS.EDIT_SHIPPING_SITE,
          value: {},
          errors: {
            ...initialSettingsStates.shipping.errors,
            site: true,
          },
        });
        expect(actual).toEqual(expected);
      });
    });
  });

  describe('shipping rate username', () => {
    test('should handle edit', () => {
      const expected = {
        ...initialSettingsStates.shipping,
        username: 'test',
      };
      const actual = shippingReducer(undefined, {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_SHIPPING_USERNAME,
        value: 'test',
      });
      expect(actual).toEqual(expected);
    });

    test('should handle errors', () => {
      const expected = {
        ...initialSettingsStates.shipping,
        username: '',
        errors: {
          ...initialSettingsStates.shipping.errors,
          username: true,
        },
      };
      const actual = shippingReducer(undefined, {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_SHIPPING_USERNAME,
        value: '',
        errors: {
          ...initialSettingsStates.shipping.errors,
          username: true,
        },
      });
      expect(actual).toEqual(expected);
    });
  });

  describe('shipping rate password', () => {
    test('should handle edit', () => {
      const expected = {
        ...initialSettingsStates.shipping,
        password: 'test',
      };
      const actual = shippingReducer(undefined, {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_SHIPPING_PASSWORD,
        value: 'test',
      });
      expect(actual).toEqual(expected);
    });

    test('should handle errors', () => {
      const expected = {
        ...initialSettingsStates.shipping,
        password: '',
        errors: {
          ...initialSettingsStates.shipping.errors,
          password: true,
        },
      };
      const actual = shippingReducer(undefined, {
        type: SETTINGS_ACTIONS.EDIT,
        field: SETTINGS_FIELDS.EDIT_SHIPPING_PASSWORD,
        value: '',
        errors: {
          ...initialSettingsStates.shipping.errors,
          password: true,
        },
      });
      expect(actual).toEqual(expected);
    });
  });
});
