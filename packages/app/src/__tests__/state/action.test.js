/* global describe it expect beforeEach */
import configureMockStore from 'redux-mock-store';

import { globalActions, GLOBAL_ACTIONS } from '../../state/actions';

const _createMockStore = configureMockStore();

describe('global actions', () => {
  let mockStore;

  const testAction = (actionCreator, expectedAction, ...params) => {
    it(`should create an action for ${expectedAction.type}`, () => {
      const action = actionCreator(...params);
      expect(action).toEqual(expectedAction);
      mockStore.dispatch(action);
      const actualActions = mockStore.getActions();
      expect(actualActions.length).toBe(1);
      expect(actualActions).toEqual([action]);
    });
  };

  beforeEach(() => {
    mockStore = _createMockStore();
  });

  testAction(globalActions.reset, { type: GLOBAL_ACTIONS.RESET });
  testAction(globalActions.setTheme, { type: GLOBAL_ACTIONS.SET_THEME, theme: 'light' }, 'light');
  testAction(globalActions.migrateState, { type: GLOBAL_ACTIONS.MIGRATE_STATE });
});
