/* global describe it expect beforeEach */
import configureMockStore from 'redux-mock-store';

import { globalActions, GLOBAL_ACTIONS } from '../../state/actions';

const _createMockStore = configureMockStore();

describe('global actions', () => {
  let mockStore;

  beforeEach(() => {
    mockStore = _createMockStore();
  });

  it('should create an action to reset', () => {
    const resetAction = globalActions.reset();
    expect(resetAction.type).toBe(GLOBAL_ACTIONS.RESET);
    mockStore.dispatch(resetAction);
    const actualActions = mockStore.getActions();
    expect(actualActions.length).toBe(1);
    expect(actualActions).toEqual([resetAction]);
  });
});
