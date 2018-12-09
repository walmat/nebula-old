/* global describe it test expect beforeEach jest */
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import * as actions from '../../../state/actions';
import { initialTaskStates } from '../../../utils/definitions/taskDefinitions';

const { taskActions, TASK_ACTIONS } = actions;
const initialTaskState = initialTaskStates.task;
const _createMockStore = configureMockStore([thunk]);

describe('task actions', () => {
  let mockStore;

  const simpleTaskTests = (action, expectedActions) => {
    mockStore.dispatch(action);
    const actualActions = mockStore.getActions();
    expect(actualActions.length).toBe(expectedActions.length);
    expect(actualActions).toEqual(expectedActions);
  };

  const asyncTaskTests = async (action, expectedActions) => {
    await mockStore.dispatch(action);
    const actualActions = mockStore.getActions();
    expect(actualActions.length).toBe(expectedActions.length);
    expect(actualActions).toEqual(expectedActions);
  };

  beforeEach(() => {
    mockStore = _createMockStore();
  });

  describe('add task', () => {
    it('should dispatch a successful action when task is valid', async () => {
      const action = taskActions.add({
        ...initialTaskState,
        product: {
          raw: '+off, +white, -egg, -shell',
        },
      });
      const expectedActions = [
        {
          type: TASK_ACTIONS.ADD,
          response: {
            task: {
              ...initialTaskState,
              product: {
                raw: '+off, +white, -egg, -shell',
                pos_keywords: ['off', 'white'],
                neg_keywords: ['egg', 'shell'],
              },
            },
          },
        },
      ];
      await asyncTaskTests(action, expectedActions);
    });

    it('should dispatch an error action when task in invalid', async () => {
      const action = taskActions.add({
        ...initialTaskState,
        product: {
          raw: 'bad, keywords',
        },
      });
      const expectedActions = [
        {
          type: TASK_ACTIONS.ERROR,
          action: TASK_ACTIONS.ADD,
          error: expect.any(Error),
        },
      ];
      await asyncTaskTests(action, expectedActions);
    });
  });

  describe('destroy task', () => {
    it('should create a successful action and call Bridge.stopTasks if availalble', async () => {
      const Bridge = {
        stopTasks: jest.fn(),
      };
      global.window.Bridge = Bridge;
      const task = { id: 42 };
      const action = taskActions.destroy(task, 'testing');
      const expectedActions = [
        {
          type: TASK_ACTIONS.REMOVE,
          response: {
            task: { id: 42 },
            type: 'testing',
          },
        },
      ];
      await asyncTaskTests(action, expectedActions);
      expect(Bridge.stopTasks).toHaveBeenCalledWith(task);
      delete global.window.Bridge;
    });

    it("should create a successful action and not call Bridge.stopTasks if it isn't available", async () => {
      const Bridge = {
        stopTasks: jest.fn(),
      };
      const task = { id: 42 };
      const action = taskActions.destroy(task, 'testing');
      const expectedActions = [
        {
          type: TASK_ACTIONS.REMOVE,
          response: {
            task: { id: 42 },
            type: 'testing',
          },
        },
      ];
      await asyncTaskTests(action, expectedActions);
      expect(Bridge.stopTasks).not.toHaveBeenCalled();
    });

    it('should create an error action when no task is given', async () => {
      const action = taskActions.destroy();
      const expectedActions = [
        {
          type: TASK_ACTIONS.ERROR,
          action: TASK_ACTIONS.REMOVE,
          error: expect.any(Error),
        },
      ];
      await asyncTaskTests(action, expectedActions);
    });
  });

  it('should create an action to edit a task', () => {
    const action = taskActions.edit(1, 'test_field', 'test_value');
    const expectedActions = [
      {
        type: TASK_ACTIONS.EDIT,
        id: 1,
        field: 'test_field',
        value: 'test_value',
      },
    ];
    simpleTaskTests(action, expectedActions);
  });

  describe('clear edits', () => {
    it('should create a successful action when a valid task is given', async () => {
      const expectedProduct = {
        ...initialTaskState.product,
        raw: 'https://test.com/myproduct',
        url: 'https://test.com/myproduct',
      };
      const task = {
        ...initialTaskState,
        product: {
          raw: 'https://test.com/myproduct',
        },
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
            task: {
              ...initialTaskState,
              product: expectedProduct,
              edits: {
                ...initialTaskState.edits,
                profile: initialTaskState.profile,
                product: expectedProduct,
                sizes: initialTaskState.sizes,
                site: initialTaskState.site,
                username: initialTaskState.username,
                password: initialTaskState.password,
              },
            },
          },
        },
      ];
      await asyncTaskTests(action, expectedActions);
    });

    it('should deselect the cleared task if it was previously selected', async () => {
      mockStore = _createMockStore({
        selectedTask: { id: 42 },
      });
      const expectedProduct = {
        ...initialTaskState.product,
        raw: 'https://test.com/myproduct',
        url: 'https://test.com/myproduct',
      };
      const task = {
        ...initialTaskState,
        product: {
          raw: 'https://test.com/myproduct',
        },
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
            task: {
              ...initialTaskState,
              product: expectedProduct,
              edits: {
                ...initialTaskState.edits,
                profile: initialTaskState.profile,
                product: expectedProduct,
                sizes: initialTaskState.sizes,
                site: initialTaskState.site,
                username: initialTaskState.username,
                password: initialTaskState.password,
              },
            },
          },
        },
        {
          type: TASK_ACTIONS.SELECT,
          task: null,
        },
      ];
      await asyncTaskTests(action, expectedActions);
    });

    it('should create an error action if task is invalid', async () => {
      const task = {
        ...initialTaskState,
        product: {
          raw: 'bad, keywords',
        },
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
          type: TASK_ACTIONS.ERROR,
          action: TASK_ACTIONS.UPDATE,
          error: expect.any(Error),
        },
      ];
      await asyncTaskTests(action, expectedActions);
    });
  });

  it('should create an action to select a task', () => {
    const action = taskActions.select('task_object');
    const expectedActions = [
      {
        type: TASK_ACTIONS.SELECT,
        task: 'task_object',
      },
    ];
    simpleTaskTests(action, expectedActions);
  });

  describe('update task', () => {
    describe('should dispatch a successful action', () => {
      const testUpdateAction = async (
        update,
        expectedUpdate,
        additionalActions,
      ) => {
        // Start with a valid product so we don't get errors
        const validProduct = {
          ...initialTaskState.product,
          raw: '12345',
          variant: '12345',
        };
        const action = taskActions.update(42, {
          ...initialTaskState,
          product: validProduct,
          edits: {
            ...initialTaskState.edits,
            ...update,
          },
        });
        const appliedUpdate = expectedUpdate || update;
        // Fill in product to make sure it's valid
        if (!appliedUpdate.product || !appliedUpdate.product.raw) {
          appliedUpdate.product = validProduct;
        }
        const expectedAction = {
          type: TASK_ACTIONS.UPDATE,
          response: {
            id: 42,
            task: {
              ...initialTaskState,
              ...appliedUpdate,
              edits: {
                ...initialTaskState.edits,
                profile: initialTaskState.profile,
                product: initialTaskState.product,
                sizes: initialTaskState.sizes,
                site: initialTaskState.site,
                username: initialTaskState.username,
                password: initialTaskState.password,
                ...appliedUpdate,
              },
            },
          },
        };
        let expectedActions = [expectedAction];
        if (additionalActions) {
          expectedActions = [expectedAction, ...additionalActions];
        }
        await asyncTaskTests(action, expectedActions);
      };

      test('when updating a profile', async () => {
        const update = {
          profile: {
            ...initialTaskState.profile,
            id: 1,
          },
        };
        await testUpdateAction(update);
      });

      test('when updating a product', async () => {
        const update = {
          product: {
            ...initialTaskState.product,
            raw: '12345',
          },
        };
        const expectedUpdate = {
          product: {
            ...initialTaskState.product,
            ...update.product,
            variant: '12345',
          },
        };
        await testUpdateAction(update, expectedUpdate);
      });

      test('when updating sizes', async () => {
        const update = {
          sizes: ['4', '5'],
        };
        await testUpdateAction(update);
      });

      test('when updating site', async () => {
        const update = {
          site: {
            name: 'test',
            url: 'http://test.com',
            supported: true,
            auth: false,
          },
          username: 'test',
          password: 'test',
        };
        const expectedUpdate = {
          ...update,
          username: '',
          password: '',
        };
        await testUpdateAction(update, expectedUpdate);
      });

      test('when updating username', async () => {
        const update = {
          site: {
            name: 'test',
            url: 'http://test.com',
            supported: true,
            auth: true,
          },
          username: 'testing',
          password: null,
        };
        await testUpdateAction(update);
      });

      test('when updating password', async () => {
        const update = {
          site: {
            name: 'test',
            url: 'http://test.com',
            supported: true,
            auth: true,
          },
          password: 'testing',
          username: null,
        };
        await testUpdateAction(update);
      });

      test('and deselect the updated task if it was previously selected', async () => {
        mockStore = _createMockStore({
          selectedTask: { id: 42 },
        });
        const update = {
          profile: {
            ...initialTaskState.profile,
            id: 1,
          },
        };
        await testUpdateAction(update, null, [
          {
            type: TASK_ACTIONS.SELECT,
            task: null,
          },
        ]);
      });
    });

    it('should apply the correct user/pass combo when not updating site', async () => {
      // Start with a valid product so we don't get errors
      const validProduct = {
        ...initialTaskState.product,
        raw: '12345',
        variant: '12345',
      };
      const initialTask = {
        ...initialTaskState,
        product: validProduct,
        site: {
          name: 'test',
          url: 'http://test.com',
          supported: true,
          auth: true,
        },
        username: 'og_username',
        password: 'og_password',
        edits: {
          ...initialTaskState.edits,
          site: null,
          username: 'new_user',
          password: 'new_pass',
        },
      };
      const action = taskActions.update(42, initialTask);
      const expectedActions = [
        {
          type: TASK_ACTIONS.UPDATE,
          response: {
            id: 42,
            task: {
              ...initialTask,
              edits: {
                ...initialTask.edits,
                profile: initialTaskState.profile,
                product: validProduct,
                sizes: initialTaskState.sizes,
                site: initialTask.site,
                username: initialTask.username,
                password: initialTask.password,
              },
            },
          },
        },
      ];
      await asyncTaskTests(action, expectedActions);
    });

    it('should dispatch an error action when task in invalid', async () => {
      const action = taskActions.update(42, {
        ...initialTaskState,
        edits: {
          ...initialTaskState.edits,
          product: {
            raw: 'bad, keywords',
          },
        },
      });
      const expectedActions = [
        {
          type: TASK_ACTIONS.ERROR,
          action: TASK_ACTIONS.UPDATE,
          error: expect.any(Error),
        },
      ];
      await asyncTaskTests(action, expectedActions);
    });
  });

  describe('start task', () => {
    describe('should create a successful action when task is not running', () => {
      test('and should call Bridge.startTasks when available', async () => {
        const Bridge = {
          startTasks: jest.fn(),
        };
        global.window.Bridge = Bridge;
        const task = { ...initialTaskState };
        const action = taskActions.start(task);
        const expectedActions = [
          {
            type: TASK_ACTIONS.START,
            response: {
              task,
            },
          },
        ];
        await asyncTaskTests(action, expectedActions);
        expect(Bridge.startTasks).toHaveBeenCalledWith(task);
        delete global.window.Bridge;
      });

      test('and should not call Bridge.startTasks when unavailable', async () => {
        const Bridge = {
          startTasks: jest.fn(),
        };
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
        expect(Bridge.startTasks).not.toHaveBeenCalled();
      });
    });

    it('should create an error action when task is already running', async () => {
      const action = taskActions.start({
        ...initialTaskState,
        status: 'running',
      });
      const expectedActions = [
        {
          type: TASK_ACTIONS.ERROR,
          action: TASK_ACTIONS.START,
          error: expect.any(Error),
        },
      ];
      await asyncTaskTests(action, expectedActions);
    });
  });

  describe('stop task', () => {
    describe('should create a successful action when task has not stopped', () => {
      test('and should call Bridge.stopTasks when available', async () => {
        const Bridge = {
          stopTasks: jest.fn(),
        };
        global.window.Bridge = Bridge;
        const task = { ...initialTaskState };
        const action = taskActions.stop(initialTaskState);
        const expectedActions = [
          {
            type: TASK_ACTIONS.STOP,
            response: {
              task,
            },
          },
        ];
        await asyncTaskTests(action, expectedActions);
        expect(Bridge.stopTasks).toHaveBeenCalledWith(task);
        delete global.window.Bridge;
      });

      test('and should not call Bridge.stopTasks when unavailable', async () => {
        const Bridge = {
          stopTasks: jest.fn(),
        };
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
        expect(Bridge.stopTasks).not.toHaveBeenCalled();
      });
    });

    it('should create an error action when task is stopped', async () => {
      const action = taskActions.stop({
        ...initialTaskState,
        status: 'stopped',
      });
      const expectedActions = [
        {
          type: TASK_ACTIONS.ERROR,
          action: TASK_ACTIONS.STOP,
          error: expect.any(Error),
        },
      ];
      await asyncTaskTests(action, expectedActions);
    });
  });

  describe('status task', () => {
    it('should create a status action when id is given', async () => {
      const action = taskActions.status(1, 'test');
      const expectedActions = [
        {
          type: TASK_ACTIONS.STATUS,
          response: {
            id: 1,
            message: 'test',
          },
        },
      ];
      await asyncTaskTests(action, expectedActions);
    });

    it('should create an error action when id is not given', async () => {
      const action = taskActions.status(null, 'test');
      const expectedActions = [
        {
          type: TASK_ACTIONS.ERROR,
          action: TASK_ACTIONS.STATUS,
          error: expect.any(Error),
        },
      ];
      await asyncTaskTests(action, expectedActions);
    });
  });

  it('should create an action to handle an error', () => {
    const action = taskActions.error(TASK_ACTIONS.STOP, 'error_message');
    const expectedActions = [
      {
        type: TASK_ACTIONS.ERROR,
        action: TASK_ACTIONS.STOP,
        error: 'error_message',
      },
    ];
    simpleTaskTests(action, expectedActions);
  });
});
