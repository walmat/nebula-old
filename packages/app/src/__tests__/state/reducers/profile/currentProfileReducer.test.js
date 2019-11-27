/* global describe it expect test */
import { currentProfileReducer } from '../../../../state/reducers/profiles/profileReducer';
import initialProfileStates from '../../../../state/initial/profiles';
import { PROFILE_ACTIONS, PAYMENT_FIELDS, PROFILE_FIELDS } from '../../../../state/actions';
import { SETTINGS_ACTIONS } from '../../../../state/actions/settings/settingsActions';

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
            const actual = currentProfileReducer(initialProfileStates.profile, action);
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

  describe('should handle delete rate action', () => {
    test('when site and rate are not given', () => {
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

      const actual = currentProfileReducer(initial, {
        type: PROFILE_ACTIONS.DELETE_RATE,
      });
      expect(actual).toEqual(initial);
    });

    test('when selectedRate is provided rate', () => {
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
              {
                name: '6-10 Business Days',
                rate: 'shopify-UPS%20GROUND%20(6-10%20business%20days)-5.00',
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
                name: '6-10 Business Days',
                rate: 'shopify-UPS%20GROUND%20(6-10%20business%20days)-5.00',
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

      const actual = currentProfileReducer(initial, {
        type: PROFILE_ACTIONS.DELETE_RATE,
        site: {
          label: 'Kith',
          value: 'https://kith.com',
        },
        rate: {
          name: '5-7 Business Days',
          rate: 'shopify-UPS%20GROUND%20(5-7%20business%20days)-10.00',
        },
      });
      expect(actual).toEqual(expected);
    });

    test('when rate is last rate in list', () => {
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

      const expected = {
        ...initialProfileStates.profile,
        selectedSite: null,
        rates: [
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

      const actual = currentProfileReducer(initial, {
        type: PROFILE_ACTIONS.DELETE_RATE,
        site: {
          label: 'Kith',
          value: 'https://kith.com',
        },
        rate: {
          name: '5-7 Business Days',
          rate: 'shopify-UPS%20GROUND%20(5-7%20business%20days)-10.00',
        },
      });
      expect(actual).toEqual(expected);
    });
  });

  describe('should handle fetch shipping actions', () => {
    test('when there are errors', () => {
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

      const actual = currentProfileReducer(initial, {
        type: SETTINGS_ACTIONS.FETCH_SHIPPING,
        errors: {},
      });
      expect(actual).toEqual(initial);
    });

    test('when there are no rates returned', () => {
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

      const actual = currentProfileReducer(initial, {
        type: SETTINGS_ACTIONS.FETCH_SHIPPING,
        response: {
          rates: undefined,
          selectedRate: {},
        },
      });
      expect(actual).toEqual(initial);
    });

    test('when there is no selectedRate returned', () => {
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

      const actual = currentProfileReducer(initial, {
        type: SETTINGS_ACTIONS.FETCH_SHIPPING,
        response: {
          rates: [],
          selectedRate: undefined,
        },
      });
      expect(actual).toEqual(initial);
    });

    test('when the current profile is not the fetched profile', () => {
      const initial = {
        ...initialProfileStates.profile,
        editId: 2,
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

      const actual = currentProfileReducer(initial, {
        type: SETTINGS_ACTIONS.FETCH_SHIPPING,
        response: {
          id: 1,
          rates: [],
          selectedRate: {},
        },
      });
      expect(actual).toEqual(initial);
    });

    test('when the rates object is the first for the given site', () => {
      const initial = {
        ...initialProfileStates.profile,
        editId: 1,
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
            selectedRate: {
              name: 'Small Goods Shipping',
              rate: 'shopify-Small%20Goods%20Shipping-7.00',
            },
          },
        ],
      };

      const expected = {
        ...initialProfileStates.profile,
        editId: 1,
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
            selectedRate: {
              name: 'Small Goods Shipping',
              rate: 'shopify-Small%20Goods%20Shipping-7.00',
            },
          },
          {
            site: {
              name: 'Nebula Bots',
              url: 'https://nebulabots.com',
            },
            rates: [
              {
                name: 'Free Shipping',
                rate: 'test',
              },
            ],
            selectedRate: {
              name: 'Free Shipping',
              rate: 'test',
            },
          },
        ],
      };

      const actual = currentProfileReducer(initial, {
        type: SETTINGS_ACTIONS.FETCH_SHIPPING,
        response: {
          id: 1,
          site: {
            name: 'Nebula Bots',
            url: 'https://nebulabots.com',
            apiKey: '',
            supported: true,
            auth: false,
          },
          rates: [
            {
              title: 'Free Shipping',
              id: 'test',
            },
          ],
          selectedRate: {
            title: 'Free Shipping',
            id: 'test',
          },
        },
      });
      expect(actual).toEqual(expected);
    });

    describe('when the rates object is not the first for the given site', () => {
      test('should filter out duplicate entries', () => {
        const initial = {
          ...initialProfileStates.profile,
          editId: 1,
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
              selectedRate: {
                name: 'Small Goods Shipping',
                rate: 'shopify-Small%20Goods%20Shipping-7.00',
              },
            },
            {
              site: {
                name: 'Nebula Bots',
                url: 'https://nebulabots.com',
              },
              rates: [
                {
                  name: 'Free Shipping',
                  rate: 'test',
                },
              ],
              selectedRate: {
                name: 'Free Shipping',
                rate: 'test',
              },
            },
          ],
        };

        const expected = {
          ...initialProfileStates.profile,
          editId: 1,
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
              selectedRate: {
                name: 'Small Goods Shipping',
                rate: 'shopify-Small%20Goods%20Shipping-7.00',
              },
            },
            {
              site: {
                name: 'Nebula Bots',
                url: 'https://nebulabots.com',
              },
              rates: [
                {
                  name: 'Free Shipping',
                  rate: 'test',
                },
              ],
              selectedRate: {
                name: 'Free Shipping',
                rate: 'test',
              },
            },
          ],
        };

        const actual = currentProfileReducer(initial, {
          type: SETTINGS_ACTIONS.FETCH_SHIPPING,
          response: {
            id: 1,
            site: {
              name: 'Nebula Bots',
              url: 'https://nebulabots.com',
              apiKey: '',
              supported: true,
              auth: false,
            },
            rates: [
              {
                title: 'Free Shipping',
                id: 'test',
              },
            ],
            selectedRate: {
              title: 'Free Shipping',
              id: 'test',
            },
          },
        });
        expect(actual).toEqual(expected);
      });

      test('should add new entries', () => {
        const initial = {
          ...initialProfileStates.profile,
          editId: 1,
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
              selectedRate: {
                name: 'Small Goods Shipping',
                rate: 'shopify-Small%20Goods%20Shipping-7.00',
              },
            },
            {
              site: {
                name: 'Nebula Bots',
                url: 'https://nebulabots.com',
              },
              rates: [
                {
                  name: 'Free Shipping',
                  rate: 'test',
                },
              ],
              selectedRate: {
                name: 'Free Shipping',
                rate: 'test',
              },
            },
          ],
        };

        const expected = {
          ...initialProfileStates.profile,
          editId: 1,
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
              selectedRate: {
                name: 'Small Goods Shipping',
                rate: 'shopify-Small%20Goods%20Shipping-7.00',
              },
            },
            {
              site: {
                name: 'Nebula Bots',
                url: 'https://nebulabots.com',
              },
              rates: [
                {
                  name: 'Free Shipping',
                  rate: 'test',
                },
                {
                  name: 'Not Free Shipping',
                  rate: 'test-rate',
                },
              ],
              selectedRate: {
                name: 'Not Free Shipping',
                rate: 'test-rate',
              },
            },
          ],
        };

        const actual = currentProfileReducer(initial, {
          type: SETTINGS_ACTIONS.FETCH_SHIPPING,
          response: {
            id: 1,
            site: {
              name: 'Nebula Bots',
              url: 'https://nebulabots.com',
              apiKey: '',
              supported: true,
              auth: false,
            },
            rates: [
              {
                title: 'Free Shipping',
                id: 'test',
              },
              {
                title: 'Not Free Shipping',
                id: 'test-rate',
              },
            ],
            selectedRate: {
              title: 'Not Free Shipping',
              id: 'test-rate',
            },
          },
        });
        expect(actual).toEqual(expected);
      });
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
