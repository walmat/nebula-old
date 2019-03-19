/* global describe it expect beforeEach */
import configureMockStore from 'redux-mock-store';

import * as actions from '../../../state/actions';
import { initialState } from '../../../state/migrators';
import initialProfileStates from '../../../state/initial/profiles';

const { settingsActions, SETTINGS_ACTIONS } = actions;
const _createMockStore = configureMockStore();

describe('settings actions', () => {
  let mockStore;

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

  test('should create an action to fetch shipping', async () => {
    const action = settingsActions.fetch();
    const expectedActions = [{ type: SETTINGS_ACTIONS.FETCH_SHIPPING }];
    await asyncSettingsTests(action, expectedActions);
  });

  test('should not return error object when shipping object is present', async () => {
    const action = settingsActions.fetch({
      name: 'test',
      product: '+test',
      profile: { ...initialProfileStates.profile, id: 1, profileName: 'test' },
      site: {
        label: 'Nebula Bots',
        value: 'https://nebulabots.com',
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
        shipping: {
          name: 'test',
          product: '+test',
          profile: { ...initialProfileStates.profile, id: 1, profileName: 'test' },
          site: {
            label: 'Nebula Bots',
            value: 'https://nebulabots.com',
            apiKey: '6526a5b5393b6316a64853cfe091841c',
            auth: false,
            supported: true,
          },
          username: '',
          password: '',
        },
      },
    ];
    await asyncSettingsTests(action, expectedActions);
  });
});
