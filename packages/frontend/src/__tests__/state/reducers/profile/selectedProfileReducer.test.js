/* global describe it expect test */
import { selectedProfileReducer } from '../../../../state/reducers/profiles/profileReducer';
import initialProfileStates from '../../../../state/initial/profiles';
import { PROFILE_ACTIONS, SETTINGS_ACTIONS } from '../../../../state/actions';

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

      const actual = selectedProfileReducer(initial, {
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

      const actual = selectedProfileReducer(initial, {
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

      const actual = selectedProfileReducer(initial, {
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
        id: 2,
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

      const actual = selectedProfileReducer(initial, {
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
        id: 1,
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
        id: 1,
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

      const actual = selectedProfileReducer(initial, {
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
          id: 1,
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
          id: 1,
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

        const actual = selectedProfileReducer(initial, {
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
          id: 1,
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
          id: 1,
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

        const actual = selectedProfileReducer(initial, {
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
