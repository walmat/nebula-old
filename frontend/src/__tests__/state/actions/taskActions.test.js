/* global describe it expect beforeEach */
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import * as actions from '../../../state/actions';
import { initialTaskState } from '../../../state/reducers/tasks/taskReducer';

const { taskActions, TASK_ACTIONS } = actions;
const _createMockStore = configureMockStore([thunk]);

describe('task actions', () => {
  let mockStore;

  const simpleTaskTests = (action, expectedActions) => {
    mockStore.dispatch(action);
    const actualActions = mockStore.getActions();
    expect(actualActions.length).toBe(1);
    expect(actualActions).toEqual(expectedActions);
  };

  const asyncTaskTests = async (action, expectedActions) => {
    await mockStore.dispatch(action);
    const actualActions = mockStore.getActions();
    expect(actualActions.length).toBe(1);
    expect(actualActions).toEqual(expectedActions);
  };

  beforeEach(() => {
    mockStore = _createMockStore();
  });

  it('should create an action to add a task', async () => {
    const action = taskActions.add({
      ...initialTaskState,
      product: {
        raw: '+off, +white',
      },
    });
    const expectedActions = [
      {
        type: TASK_ACTIONS.ADD,
        response: {
          task: {
            ...initialTaskState,
            product: {
              raw: '+off, +white',
              pos_keywords: ['off', 'white'],
              neg_keywords: [],
            },
          },
        },
      },
    ];
    await asyncTaskTests(action, expectedActions);
  });

  it('should create an action to destroy a task', async () => {
    const action = taskActions.destroy(42);
    const expectedActions = [
      {
        type: TASK_ACTIONS.REMOVE,
        response: {
          id: 42,
        },
      },
    ];
    await asyncTaskTests(action, expectedActions);
  });

  it('should create an action to edit a task', () => {
    const action = taskActions.edit(1, 'test_field', 'test_value');
    const expectedActions = [
      {
        type: TASK_ACTIONS.EDIT, id: 1, field: 'test_field', value: 'test_value',
      },
    ];
    simpleTaskTests(action, expectedActions);
  });

  it('should create an action to clear edits of a task', async () => {
    const task = {
      ...initialTaskState,
      edits: {
        product: {},
        sizes: [],
        username: 'testing',
        password: 'testing',
        profile: {},
      },
    };
    const action = taskActions.clearEdits(42, task);
    const expectedActions = [
      {
        type: TASK_ACTIONS.UPDATE,
        response: {
          id: 42,
          task: Object.assign({}, initialTaskState, {
            edits: {
              ...initialTaskState.edits,
              profile: initialTaskState.profile,
              product: initialTaskState.product,
              sizes: initialTaskState.sizes,
              site: initialTaskState.site,
              username: initialTaskState.username,
              password: initialTaskState.password,
            },
          }),
        },
      },
    ];
    await asyncTaskTests(action, expectedActions);
  });

  it('should create an action to select a task', () => {
    const action = taskActions.select('task_object');
    const expectedActions = [
      {
        type: TASK_ACTIONS.SELECT, task: 'task_object',
      },
    ];
    simpleTaskTests(action, expectedActions);
  });

  it('should create an action to update a task', async () => {
    const action = taskActions.update(42, initialTaskState);
    const expectedActions = [
      {
        type: TASK_ACTIONS.UPDATE,
        response: {
          id: 42,
          task: Object.assign({}, initialTaskState, {
            edits: {
              ...initialTaskState.edits,
              profile: initialTaskState.profile,
              product: initialTaskState.product,
              sizes: initialTaskState.sizes,
              site: initialTaskState.site,
              username: initialTaskState.username,
              password: initialTaskState.password,
            },
          }),
        },
      },
    ];
    await asyncTaskTests(action, expectedActions);
  });

  it('should create an action to start a task', async () => {
    const action = taskActions.start(initialTaskState);
    const expectedActions = [
      {
        type: TASK_ACTIONS.START,
        response: {
          task: initialTaskState,
        },
      },
    ];
    await asyncTaskTests(action, expectedActions);
  });

  it('should create an action to stop a task', async () => {
    const action = taskActions.stop(initialTaskState);
    const expectedActions = [
      {
        type: TASK_ACTIONS.STOP,
        response: {
          task: initialTaskState,
        },
      },
    ];
    await asyncTaskTests(action, expectedActions);
  });

  it('should create an action to handle an error', () => {
    const action = taskActions.error(TASK_ACTIONS.STOP, 'error_message');
    const expectedActions = [
      {
        type: TASK_ACTIONS.ERROR, action: TASK_ACTIONS.STOP, error: 'error_message',
      },
    ];
    simpleTaskTests(action, expectedActions);
  });
});
