/* global describe it expect */
import ratesReducer from '../../../../state/reducers/profiles/ratesReducer';
import initialProfileStates from '../../../../state/initial/profiles';
import { RATES_FIELDS } from '../../../../state/actions';

describe('rates reducer', () => {
  it('should return initial state', () => {
    const actual = ratesReducer(undefined, {});
    expect(actual).toEqual(initialProfileStates.rates);
  });

  describe('should handle rate action', () => {
    test('when action is undefined', () => {
      const initial = [
        ...initialProfileStates.rates,
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
      ];

      const actual = ratesReducer(initial, undefined);

      expect(actual).toEqual(initial);
    });

    test('when action type is undefined', () => {
      const initial = [
        ...initialProfileStates.rates,
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
      ];

      const actual = ratesReducer(initial, {
        type: undefined,
      });

      expect(actual).toEqual(initial);
    });

    test('when action is valid object but no site object is found', () => {
      const initial = [
        ...initialProfileStates.rates,
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
      ];

      const actual = ratesReducer(initial, {
        type: RATES_FIELDS.RATE,
        site: {
          value: 'https://nebulabots.com',
          label: 'Nebula Bots',
        },
      });

      expect(actual).toEqual(initial);
    });

    test('when action is valid object and site object is found', () => {
      const initial = [
        ...initialProfileStates.rates,
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
      ];

      const expected = [
        ...initialProfileStates.rates,
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
      ];

      const actual = ratesReducer(initial, {
        type: RATES_FIELDS.RATE,
        site: {
          value: 'https://kith.com',
          label: 'Nebula Bots',
        },
        rate: {
          label: '5-7 Business Days',
          value: 'shopify-UPS%20GROUND%20(5-7%20business%20days)-10.00',
        },
      });

      expect(actual).toEqual(expected);
    });
  });

  describe('should handle default action', () => {
    test('when mapping to field is properly found', () => {
      const initial = [
        ...initialProfileStates.rates,
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
      ];

      const actual = ratesReducer(initial, {
        type: RATES_FIELDS.NAME,
        value: {
          label: '5-7 Business Days',
          value: 'shopify-UPS%20GROUND%20(5-7%20business%20days)-10.00',
        },
      });

      expect(actual).toEqual(initial);
    });

    test('when mapping to field is not found', () => {
      const initial = [
        ...initialProfileStates.rates,
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
      ];

      const actual = ratesReducer(initial, {
        type: 'INVALID',
      });

      expect(actual).toEqual(initial);
    });
  });

  it('should not respond to invalid actions', () => {
    const actual = ratesReducer(initialProfileStates.rates, {
      type: 'INVALID',
    });
    expect(actual).toEqual(initialProfileStates.rates);
  });
});
