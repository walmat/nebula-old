/* global describe it expect beforeEach */
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import * as actions from '../../../state/actions';
import initialProfileStates from '../../../state/initial/profiles';

const initialProfileState = initialProfileStates.profile;

const { profileActions, PROFILE_ACTIONS } = actions;
const _createMockStore = configureMockStore([thunk]);

describe('profile actions', () => {
  let mockStore;

  const simpleProfileTests = (action, expectedActions) => {
    mockStore.dispatch(action);
    const actualActions = mockStore.getActions();
    expect(actualActions.length).toBe(1);
    expect(actualActions).toEqual(expectedActions);
  };

  const asyncProfileTests = async (action, expectedActions) => {
    await mockStore.dispatch(action);
    const actualActions = mockStore.getActions();
    expect(actualActions.length).toBe(1);
    expect(actualActions).toEqual(expectedActions);
  };

  beforeEach(() => {
    mockStore = _createMockStore();
  });

  it('should create an action to add a profile', async () => {
    const action = profileActions.add(initialProfileState);
    const expectedActions = [{ type: PROFILE_ACTIONS.ADD, profile: initialProfileState }];
    await asyncProfileTests(action, expectedActions);
  });

  it('should create an error action when adding an invalid profile', async () => {
    const action = profileActions.add(null);
    const expectedActions = [
      {
        type: PROFILE_ACTIONS.ERROR,
        action: PROFILE_ACTIONS.ADD,
        error: new Error('Invalid profile!'),
      },
    ];
    await asyncProfileTests(action, expectedActions);
  });

  it('should create an action to remove a profile', async () => {
    const action = profileActions.remove(42);
    const expectedActions = [{ type: PROFILE_ACTIONS.REMOVE, id: 42 }];
    await asyncProfileTests(action, expectedActions);
  });

  it('should create an error action when removing an invalid profile', async () => {
    const action = profileActions.remove(null);
    const expectedActions = [
      {
        type: PROFILE_ACTIONS.ERROR,
        action: PROFILE_ACTIONS.REMOVE,
        error: new Error('Invalid profile!'),
      },
    ];
    await asyncProfileTests(action, expectedActions);
  });

  it('should create an action to edit a profile', () => {
    const action = profileActions.edit(23, 'test_field', 'test_value', 'test_subField');
    const expectedActions = [
      {
        type: PROFILE_ACTIONS.EDIT,
        id: 23,
        field: 'test_field',
        value: 'test_value',
        subField: 'test_subField',
      },
    ];
    simpleProfileTests(action, expectedActions);
  });

  it('should create an action to select a profile', () => {
    const action = profileActions.select(initialProfileState);
    const expectedActions = [{ type: PROFILE_ACTIONS.SELECT, profile: initialProfileState }];
    simpleProfileTests(action, expectedActions);
  });

  it('should create an action to load a profile', () => {
    const action = profileActions.load(initialProfileState);
    const expectedActions = [{ type: PROFILE_ACTIONS.LOAD, profile: initialProfileState }];
    simpleProfileTests(action, expectedActions);
  });

  it('should create an action to update a profile', async () => {
    const action = profileActions.update(50, initialProfileState);
    const expectedActions = [
      {
        type: PROFILE_ACTIONS.UPDATE,
        id: 50,
        profile: {
          ...initialProfileState,
          id: 50,
        },
      },
    ];
    await asyncProfileTests(action, expectedActions);
  });

  it('should create an error action when updating an invalid profile', async () => {
    const action = profileActions.update(null);
    const expectedActions = [
      {
        type: PROFILE_ACTIONS.ERROR,
        action: PROFILE_ACTIONS.UPDATE,
        error: new Error('Invalid profile!'),
      },
    ];
    await asyncProfileTests(action, expectedActions);
  });

  it('should create an action to handle a profile error', () => {
    const action = profileActions.error(PROFILE_ACTIONS.ADD, 'error_message');
    const expectedActions = [
      {
        type: PROFILE_ACTIONS.ERROR,
        action: PROFILE_ACTIONS.ADD,
        error: 'error_message',
      },
    ];
    simpleProfileTests(action, expectedActions);
  });
});
