/* global describe expect it test jest */
import { newTaskReducer } from '../../../../state/reducers/tasks/taskReducer';
import initialTaskStates from '../../../../state/initial/tasks';
import initialProfileStates from '../../../../state/initial/profiles';
import {
  PROFILE_ACTIONS,
  TASK_ACTIONS,
  TASK_FIELDS,
  SETTINGS_ACTIONS,
  SETTINGS_FIELDS,
} from '../../../../state/actions';

describe('new task reducer', () => {
  it('should return initial state', () => {
    const actual = newTaskReducer(undefined, {});
    expect(actual).toEqual(initialTaskStates.task);
  });

  describe('should handle edit', () => {
    test('when action is valid', () => {
      const expected = {
        ...initialTaskStates.task,
        username: 'test',
      };
      const actual = newTaskReducer(initialTaskStates.task, {
        type: TASK_ACTIONS.EDIT,
        id: null,
        field: TASK_FIELDS.EDIT_USERNAME,
        value: 'test',
      });
      expect(actual).toEqual(expected);
    });

    describe('when updating error delay', () => {
      test('with no action value', () => {
        const expected = {
          ...initialTaskStates.task,
          errorDelay: 0,
        };

        const actual = newTaskReducer(initialTaskStates.task, {
          type: SETTINGS_ACTIONS.EDIT,
          id: null,
          field: SETTINGS_FIELDS.EDIT_ERROR_DELAY,
          value: undefined,
        });
        expect(actual).toEqual(expected);
      });

      test('with action value being non-numerical', () => {
        const expected = {
          ...initialTaskStates.task,
          errorDelay: 1500,
        };

        const actual = newTaskReducer(initialTaskStates.task, {
          type: SETTINGS_ACTIONS.EDIT,
          id: null,
          field: SETTINGS_FIELDS.EDIT_ERROR_DELAY,
          value: 'test',
        });
        expect(actual).toEqual(expected);
      });

      test('with action value being numerical', () => {
        const expected = {
          ...initialTaskStates.task,
          errorDelay: 5000,
        };

        const actual = newTaskReducer(initialTaskStates.task, {
          type: SETTINGS_ACTIONS.EDIT,
          id: null,
          field: SETTINGS_FIELDS.EDIT_ERROR_DELAY,
          value: 5000,
        });
        expect(actual).toEqual(expected);
      });
    });

    describe('when updating monitor delay', () => {
      test('with no action value', () => {
        const expected = {
          ...initialTaskStates.task,
          monitorDelay: 0,
        };

        const actual = newTaskReducer(initialTaskStates.task, {
          type: SETTINGS_ACTIONS.EDIT,
          id: null,
          field: SETTINGS_FIELDS.EDIT_MONITOR_DELAY,
          value: undefined,
        });
        expect(actual).toEqual(expected);
      });

      test('with action value being non-numerical', () => {
        const expected = {
          ...initialTaskStates.task,
          monitorDelay: 1500,
        };

        const actual = newTaskReducer(initialTaskStates.task, {
          type: SETTINGS_ACTIONS.EDIT,
          id: null,
          field: SETTINGS_FIELDS.EDIT_MONITOR_DELAY,
          value: 'test',
        });
        expect(actual).toEqual(expected);
      });

      test('with action value being numerical', () => {
        const expected = {
          ...initialTaskStates.task,
          monitorDelay: 5000,
        };

        const actual = newTaskReducer(initialTaskStates.task, {
          type: SETTINGS_ACTIONS.EDIT,
          id: null,
          field: SETTINGS_FIELDS.EDIT_MONITOR_DELAY,
          value: 5000,
        });
        expect(actual).toEqual(expected);
      });
    });

    test('when updating discord webhook', () => {
      const expected = {
        ...initialTaskStates.task,
        discord: 'test',
      };

      const actual = newTaskReducer(initialTaskStates.task, {
        type: SETTINGS_ACTIONS.EDIT,
        id: null,
        field: SETTINGS_FIELDS.EDIT_DISCORD,
        value: 'test',
      });
      expect(actual).toEqual(expected);
    });

    describe('should not respond to edits on', () => {
      test('proxies', () => {
        const actual = newTaskReducer(initialTaskStates.task, {
          type: SETTINGS_ACTIONS.EDIT,
          id: null,
          field: SETTINGS_FIELDS.EDIT_PROXIES,
          value: 'test',
        });
        expect(actual).toEqual(initialTaskStates.task);
      });

      test('defaults', () => {
        const actual = newTaskReducer(initialTaskStates.task, {
          type: SETTINGS_ACTIONS.EDIT,
          id: null,
          field: SETTINGS_FIELDS.EDIT_DEFAULT_SIZES,
          value: ['5'],
        });
        expect(actual).toEqual(initialTaskStates.task);
      });

      test('shippings ', () => {
        const actual = newTaskReducer(initialTaskStates.task, {
          type: SETTINGS_ACTIONS.EDIT,
          id: null,
          field: SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT,
          value: '+test',
        });
        expect(actual).toEqual(initialTaskStates.task);
      });
    });

    test('when updating slack webhook', () => {
      const expected = {
        ...initialTaskStates.task,
        slack: 'test',
      };

      const actual = newTaskReducer(initialTaskStates.task, {
        type: SETTINGS_ACTIONS.EDIT,
        id: null,
        field: SETTINGS_FIELDS.EDIT_SLACK,
        value: 'test',
      });
      expect(actual).toEqual(expected);
    });

    test('when id is non-null', () => {
      const actual = newTaskReducer(initialTaskStates.task, {
        type: TASK_ACTIONS.EDIT,
        id: 1,
        field: TASK_FIELDS.EDIT_USERNAME,
        value: 'test',
      });
      expect(actual).toEqual(initialTaskStates.task);
    });

    test('when field is not given', () => {
      const actual = newTaskReducer(initialTaskStates.task, {
        type: TASK_ACTIONS.EDIT,
        id: null,
        value: 'test',
      });
      expect(actual).toEqual(initialTaskStates.task);
    });

    test('when field is invalid', () => {
      const actual = newTaskReducer(initialTaskStates.task, {
        type: TASK_ACTIONS.EDIT,
        id: null,
        field: 'INVALID',
        value: 'test',
      });
      expect(actual).toEqual(initialTaskStates.task);
    });

    test('when value is not given', () => {
      const actual = newTaskReducer(initialTaskStates.task, {
        type: TASK_ACTIONS.EDIT,
        id: null,
        field: TASK_FIELDS.EDIT_USERNAME,
      });
      expect(actual).toEqual(initialTaskStates.task);
    });
  });

  describe('should handle profile updates', () => {
    test('when no profile is given', () => {
      const actual = newTaskReducer(initialTaskStates.task, {
        type: PROFILE_ACTIONS.UPDATE,
        profile: undefined,
      });
      expect(actual).toEqual(initialTaskStates.task);
    });

    test('when errors are given', () => {
      const actual = newTaskReducer(initialTaskStates.task, {
        type: PROFILE_ACTIONS.UPDATE,
        profile: {},
        errors: {},
      });
      expect(actual).toEqual(initialTaskStates.task);
    });

    test('when selected profile is the updated profile', () => {
      const initial = {
        ...initialTaskStates.task,
        profile: {
          ...initialProfileStates.profile,
          id: 1,
          profileName: 'test',
        },
      };

      const expected = {
        ...initialTaskStates.task,
        profile: {
          ...initialProfileStates.profile,
          id: 1,
          profileName: 'test change',
        },
      };

      const actual = newTaskReducer(initial, {
        type: PROFILE_ACTIONS.UPDATE,
        profile: {
          ...initialProfileStates.profile,
          id: 1,
          profileName: 'test change',
        },
      });
      expect(actual).toEqual(expected);
    });

    test('when selected profile is not the updated profile', () => {
      const initial = {
        ...initialTaskStates.task,
        profile: {
          ...initialProfileStates.profile,
          id: 1,
          profileName: 'test',
        },
      };

      const actual = newTaskReducer(initial, {
        type: PROFILE_ACTIONS.UPDATE,
        profile: {
          ...initialProfileStates.profile,
          id: 2,
          profileName: 'test change',
        },
      });
      expect(actual).toEqual(initial);
    });
  });

  describe('should handle profile removal', () => {
    it('when no action id is present', () => {
      const actual = newTaskReducer(initialTaskStates.task, {
        type: PROFILE_ACTIONS.REMOVE,
        id: undefined,
      });
      expect(actual).toEqual(initialTaskStates.task);
    });

    it('when id matches the profile that is selected', () => {
      const initial = {
        ...initialTaskStates.task,
        profile: {
          ...initialProfileStates.profile,
          id: 1,
          profileName: 'test',
        },
      };

      const actual = newTaskReducer(initial, {
        type: PROFILE_ACTIONS.REMOVE,
        id: 1,
      });
      expect(actual).toEqual(initialTaskStates.task);
    });

    it('when id does not match the profile that is selected', () => {
      const initial = {
        ...initialTaskStates.task,
        profile: {
          ...initialProfileStates.profile,
          id: 1,
          profileName: 'test',
        },
      };

      const actual = newTaskReducer(initial, {
        type: PROFILE_ACTIONS.REMOVE,
        id: 2,
      });
      expect(actual).toEqual(initial);
    });
  });
  describe('should handle add', () => {
    describe('when action is valid', () => {
      test('when defaults are not given', () => {
        const start = {
          ...initialTaskStates.task,
          username: 'test',
        };
        const actual = newTaskReducer(start, {
          type: TASK_ACTIONS.ADD,
          response: { task: {} },
        });
        expect(actual).toEqual(start);
      });

      describe('when defaults are given', () => {
        test("when defaults shouldn't be used", () => {
          const start = {
            ...initialTaskStates.task,
            username: 'test',
          };
          const actual = newTaskReducer(
            start,
            {
              type: TASK_ACTIONS.ADD,
              response: { task: {} },
            },
            {
              profile: { id: 1 },
              sizes: ['4'],
              useProfile: false,
              useSizes: false,
            },
          );
          expect(actual).toEqual(start);
        });

        test('when default sizes should be used', () => {
          const start = {
            ...initialTaskStates.task,
            username: 'test',
          };
          const expected = {
            ...initialTaskStates.task,
            username: 'test',
            sizes: ['5.5'],
          };
          const actual = newTaskReducer(
            start,
            {
              type: TASK_ACTIONS.ADD,
              response: { task: {} },
            },
            {
              sizes: ['5.5'],
              useSizes: true,
            },
          );
          expect(actual).toEqual(expected);
        });

        test('when default profile should be used', () => {
          const start = {
            ...initialTaskStates.task,
            username: 'test',
          };
          const expected = {
            ...initialTaskStates.task,
            username: 'test',
            profile: { id: 42 },
          };
          const actual = newTaskReducer(
            start,
            {
              type: TASK_ACTIONS.ADD,
              response: { task: {} },
            },
            {
              profile: { id: 42 },
              useProfile: true,
            },
          );
          expect(actual).toEqual(expected);
        });
      });
    });

    test('when task is not given', () => {
      const start = {
        ...initialTaskStates.task,
        username: 'test',
      };
      const actual = newTaskReducer(start, {
        type: TASK_ACTIONS.ADD,
        response: {},
      });
      expect(actual).toEqual(start);
    });

    test('when response is not given', () => {
      const start = {
        ...initialTaskStates.task,
        username: 'test',
      };
      const actual = newTaskReducer(start, { type: TASK_ACTIONS.ADD });
      expect(actual).toEqual(start);
    });

    test('when errors map is given', () => {
      const start = {
        ...initialTaskStates.task,
      };
      const actual = newTaskReducer(start, {
        type: TASK_ACTIONS.ADD,
        errors: {},
      });
      expect(actual).toEqual(start);
    });
  });

  describe('should not respond to', () => {
    const _testNoopResponse = type => {
      const actual = newTaskReducer(initialTaskStates.task, { type });
      expect(actual).toEqual(initialTaskStates.task);
    };

    test('destroy action', () => {
      _testNoopResponse(TASK_ACTIONS.REMOVE);
    });

    test('select action', () => {
      _testNoopResponse(TASK_ACTIONS.SELECT);
    });

    test('load action', () => {
      _testNoopResponse(TASK_ACTIONS.LOAD);
    });

    test('update action', () => {
      _testNoopResponse(TASK_ACTIONS.UPDATE);
    });

    test('start action', () => {
      _testNoopResponse(TASK_ACTIONS.START);
    });

    test('stop action', () => {
      _testNoopResponse(TASK_ACTIONS.STOP);
    });

    test('error action', () => {
      _testNoopResponse(TASK_ACTIONS.ERROR);
    });
  });
});
