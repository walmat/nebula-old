/* global describe it expect beforeEach */
import configureMockStore from 'redux-mock-store';

import * as actions from '../../../state/actions';
import { initialState } from '../../../state/migrators';

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
    const action = settingsActions.clear();
    const expectedActions = [{ type: SETTINGS_ACTIONS.CLEAR }];
    settingsTests(action, expectedActions);
  });
});
