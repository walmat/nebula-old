/* global describe it expect beforeEach */
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import * as actions from '../../../state/actions';
import { initialState } from '../../../state/migrators';
import initialProfileStates from '../../../state/initial/profiles';
import initialSettingsStates from '../../../state/initial/settings';

const { settingsActions, SETTINGS_ACTIONS } = actions;
const _createMockStore = configureMockStore([thunk]);

describe('settings actions', () => {
  let mockStore;
  let Bridge;

  const settingsTests = (action, expectedActions) => {
    mockStore.dispatch(action);
    const actualActions = mockStore.getActions();
    expect(actualActions.length).toBe(1);
    expect(actualActions).toEqual(expectedActions);
  };

  const asyncSettingsTests = async (action, expectedActions) => {
    await mockStore.dispatch(action);
    const actualActions = mockStore.getActions();
    expect(actualActions.length).toBe(1);
    expect(actualActions).toEqual(expectedActions);
  };

  beforeEach(() => {
    mockStore = _createMockStore(initialState);
    Bridge = {
      startShippingRatesRunner: () => {},
    };
  });

  describe('fetch shipping', () => {
    it('should dispatch a successful action when shipping is valid', async () => {
      const action = settingsActions.fetch({
        ...initialSettingsStates.shipping,
        name: 'test',
        product: { ...initialSettingsStates.shipping.product, raw: '+test' },
        profile: { ...initialProfileStates.profile, id: 1, profileName: 'test' },
        site: {
          name: 'Nebula Bots',
          url: 'https://nebulabots.com',
          apiKey: '6526a5b5393b6316a64853cfe091841c',
          auth: false,
          supported: true,
        },
        username: '',
        password: '',
      });
      const expectedActions = [
        {
          type: SETTINGS_ACTIONS.FETCH_SHIPPING,
          response: {
            shipping: {
              ...initialSettingsStates.shipping,
              product: {
                ...initialSettingsStates.shipping.product,
                raw: '+test',
                pos_keywords: ['test'],
                neg_keywords: [],
              },
              name: 'test',
              profile: { ...initialProfileStates.profile, id: 1, profileName: 'test' },
              site: {
                ...initialSettingsStates.shipping.site,
                name: 'Nebula Bots',
                url: 'https://nebulabots.com',
                apiKey: '6526a5b5393b6316a64853cfe091841c',
                auth: false,
                supported: true,
              },
              username: '',
              password: '',
            },
          },
        },
      ];
      await asyncSettingsTests(action, expectedActions);
    });

    it('should dispatch an error action when shipping in invalid', async () => {
      const action = settingsActions.fetch({
        ...initialSettingsStates.shipping,
        product: {
          raw: 'wrong keywords format',
        },
      });
      const expectedActions = [
        {
          type: SETTINGS_ACTIONS.ERROR,
          action: SETTINGS_ACTIONS.FETCH_SHIPPING,
          error: expect.any(Error),
        },
      ];
      await asyncSettingsTests(action, expectedActions);
    });
  });

  it('should create an action to edit settings', () => {
    const action = settingsActions.edit('test_field', 'test_value');
    const expectedActions = [
      { type: SETTINGS_ACTIONS.EDIT, field: 'test_field', value: 'test_value' },
    ];
    settingsTests(action, expectedActions);
  });

  it('should create an action to save defaults', () => {
    const testDefaults = {
      def1: 'test',
      def2: 'test2',
      def3: 'test3',
    };
    const action = settingsActions.save(testDefaults);
    const expectedActions = [{ type: SETTINGS_ACTIONS.SAVE, defaults: testDefaults }];
    settingsTests(action, expectedActions);
  });

  it('should create an action to clear defaults', () => {
    const action = settingsActions.clearDefaults();
    const expectedActions = [{ type: SETTINGS_ACTIONS.CLEAR_DEFAULTS }];
    settingsTests(action, expectedActions);
  });
});
