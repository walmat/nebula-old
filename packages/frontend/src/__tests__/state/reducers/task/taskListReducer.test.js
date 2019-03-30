/* global describe expect it test beforeEach jest */
import taskListReducer from '../../../../state/reducers/tasks/taskListReducer';
import initialTaskStates from '../../../../state/initial/tasks';
import initialProfileStates from '../../../../state/initial/profiles';
import {
  TASK_ACTIONS,
  TASK_FIELDS,
  SETTINGS_ACTIONS,
  SETTINGS_FIELDS,
  PROFILE_ACTIONS,
} from '../../../../state/actions';

describe('task list reducer', () => {
  it('should return initial state', () => {
    const actual = taskListReducer(undefined, {});
    expect(actual).toEqual(initialTaskStates.list);
  });

  describe('should update existing tasks', () => {
    describe('when editing settings field', () => {
      test('discord', () => {
        const start = [
          {
            ...initialTaskStates.task,
            id: 'task1',
            index: 1,
          },
          {
            ...initialTaskStates.task,
            id: 'task3',
            index: 3,
          },
        ];

        const expected = [
          {
            ...initialTaskStates.task,
            id: 'task1',
            index: 1,
            discord: 'test',
          },
          {
            ...initialTaskStates.task,
            id: 'task3',
            index: 3,
            discord: 'test',
          },
        ];

        const actual = taskListReducer(start, {
          type: SETTINGS_ACTIONS.EDIT,
          field: SETTINGS_FIELDS.EDIT_DISCORD,
          value: 'test',
        });

        expect(actual).toEqual(expected);
      });

      test('slack', () => {
        const start = [
          {
            ...initialTaskStates.task,
            id: 'task1',
            index: 1,
          },
          {
            ...initialTaskStates.task,
            id: 'task3',
            index: 3,
          },
        ];

        const expected = [
          {
            ...initialTaskStates.task,
            id: 'task1',
            index: 1,
            slack: 'test',
          },
          {
            ...initialTaskStates.task,
            id: 'task3',
            index: 3,
            slack: 'test',
          },
        ];

        const actual = taskListReducer(start, {
          type: SETTINGS_ACTIONS.EDIT,
          field: SETTINGS_FIELDS.EDIT_SLACK,
          value: 'test',
        });

        expect(actual).toEqual(expected);
      });

      describe('monitor delay', () => {
        test('when value is greater than 0', () => {
          const start = [
            {
              ...initialTaskStates.task,
              id: 'task1',
              index: 1,
            },
            {
              ...initialTaskStates.task,
              id: 'task3',
              index: 3,
            },
          ];

          const expected = [
            {
              ...initialTaskStates.task,
              id: 'task1',
              index: 1,
              monitorDelay: 1500,
            },
            {
              ...initialTaskStates.task,
              id: 'task3',
              index: 3,
              monitorDelay: 1500,
            },
          ];

          const actual = taskListReducer(start, {
            type: SETTINGS_ACTIONS.EDIT,
            field: SETTINGS_FIELDS.EDIT_MONITOR_DELAY,
            value: 1500,
          });

          expect(actual).toEqual(expected);
        });

        test('when value is empty due to backspacing', () => {
          const start = [
            {
              ...initialTaskStates.task,
              id: 'task1',
              index: 1,
            },
            {
              ...initialTaskStates.task,
              id: 'task3',
              index: 3,
            },
          ];

          const expected = [
            {
              ...initialTaskStates.task,
              id: 'task1',
              index: 1,
              monitorDelay: 0,
            },
            {
              ...initialTaskStates.task,
              id: 'task3',
              index: 3,
              monitorDelay: 0,
            },
          ];

          const actual = taskListReducer(start, {
            type: SETTINGS_ACTIONS.EDIT,
            field: SETTINGS_FIELDS.EDIT_MONITOR_DELAY,
            value: '',
          });

          expect(actual).toEqual(expected);
        });

        test('when value is non-numerical', () => {
          const start = [
            {
              ...initialTaskStates.task,
              id: 'task1',
              index: 1,
            },
            {
              ...initialTaskStates.task,
              id: 'task3',
              index: 3,
            },
          ];

          const expected = [
            {
              ...initialTaskStates.task,
              id: 'task1',
              index: 1,
              errorDelay: 1500,
            },
            {
              ...initialTaskStates.task,
              id: 'task3',
              index: 3,
              errorDelay: 1500,
            },
          ];

          const actual = taskListReducer(start, {
            type: SETTINGS_ACTIONS.EDIT,
            field: SETTINGS_FIELDS.EDIT_MONITOR_DELAY,
            value: 'test',
          });

          expect(actual).toEqual(expected);
        });
      });

      describe('error delay', () => {
        test('when value is greater than 0', () => {
          const start = [
            {
              ...initialTaskStates.task,
              id: 'task1',
              index: 1,
            },
            {
              ...initialTaskStates.task,
              id: 'task3',
              index: 3,
            },
          ];

          const expected = [
            {
              ...initialTaskStates.task,
              id: 'task1',
              index: 1,
              errorDelay: 1500,
            },
            {
              ...initialTaskStates.task,
              id: 'task3',
              index: 3,
              errorDelay: 1500,
            },
          ];

          const actual = taskListReducer(start, {
            type: SETTINGS_ACTIONS.EDIT,
            field: SETTINGS_FIELDS.EDIT_ERROR_DELAY,
            value: 1500,
          });

          expect(actual).toEqual(expected);
        });

        test('when value is empty due to backspacing', () => {
          const start = [
            {
              ...initialTaskStates.task,
              id: 'task1',
              index: 1,
            },
            {
              ...initialTaskStates.task,
              id: 'task3',
              index: 3,
            },
          ];

          const expected = [
            {
              ...initialTaskStates.task,
              id: 'task1',
              index: 1,
              errorDelay: 0,
            },
            {
              ...initialTaskStates.task,
              id: 'task3',
              index: 3,
              errorDelay: 0,
            },
          ];

          const actual = taskListReducer(start, {
            type: SETTINGS_ACTIONS.EDIT,
            field: SETTINGS_FIELDS.EDIT_ERROR_DELAY,
            value: '',
          });

          expect(actual).toEqual(expected);
        });

        test('when value is non-numerical', () => {
          const start = [
            {
              ...initialTaskStates.task,
              id: 'task1',
              index: 1,
            },
            {
              ...initialTaskStates.task,
              id: 'task3',
              index: 3,
            },
          ];

          const expected = [
            {
              ...initialTaskStates.task,
              id: 'task1',
              index: 1,
              errorDelay: 1500,
            },
            {
              ...initialTaskStates.task,
              id: 'task3',
              index: 3,
              errorDelay: 1500,
            },
          ];

          const actual = taskListReducer(start, {
            type: SETTINGS_ACTIONS.EDIT,
            field: SETTINGS_FIELDS.EDIT_ERROR_DELAY,
            value: 'test',
          });

          expect(actual).toEqual(expected);
        });
      });

      describe('no operation fields', () => {
        test('default profile', () => {
          const start = [
            {
              ...initialTaskStates.task,
              id: 'task1',
              index: 1,
            },
            {
              ...initialTaskStates.task,
              id: 'task3',
              index: 3,
            },
          ];

          const actual = taskListReducer(start, {
            type: SETTINGS_ACTIONS.EDIT,
            field: SETTINGS_FIELDS.EDIT_DEFAULT_PROFILE,
            value: { ...initialProfileStates.profile, id: 1, profileName: 'test' },
          });

          expect(actual).toEqual(start);
        });

        test('default sizes', () => {
          const start = [
            {
              ...initialTaskStates.task,
              id: 'task1',
              index: 1,
            },
            {
              ...initialTaskStates.task,
              id: 'task3',
              index: 3,
            },
          ];

          const actual = taskListReducer(start, {
            type: SETTINGS_ACTIONS.EDIT,
            field: SETTINGS_FIELDS.EDIT_DEFAULT_SIZES,
            value: ['Random'],
          });

          expect(actual).toEqual(start);
        });

        test('proxies', () => {
          const start = [
            {
              ...initialTaskStates.task,
              id: 'task1',
              index: 1,
            },
            {
              ...initialTaskStates.task,
              id: 'task3',
              index: 3,
            },
          ];

          const actual = taskListReducer(start, {
            type: SETTINGS_ACTIONS.EDIT,
            field: SETTINGS_FIELDS.EDIT_PROXIES,
            value: '127.0.0.1:888',
          });

          expect(actual).toEqual(start);
        });

        test('shipping product', () => {
          const start = [
            {
              ...initialTaskStates.task,
              id: 'task1',
              index: 1,
            },
            {
              ...initialTaskStates.task,
              id: 'task3',
              index: 3,
            },
          ];

          const actual = taskListReducer(start, {
            type: SETTINGS_ACTIONS.EDIT,
            field: SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT,
            value: '+test',
          });

          expect(actual).toEqual(start);
        });

        test('shipping rate name', () => {
          const start = [
            {
              ...initialTaskStates.task,
              id: 'task1',
              index: 1,
            },
            {
              ...initialTaskStates.task,
              id: 'task3',
              index: 3,
            },
          ];

          const actual = taskListReducer(start, {
            type: SETTINGS_ACTIONS.EDIT,
            field: SETTINGS_FIELDS.EDIT_SHIPPING_RATE_NAME,
            value: 'test',
          });

          expect(actual).toEqual(start);
        });

        test('shipping profile', () => {
          const start = [
            {
              ...initialTaskStates.task,
              id: 'task1',
              index: 1,
            },
            {
              ...initialTaskStates.task,
              id: 'task3',
              index: 3,
            },
          ];

          const actual = taskListReducer(start, {
            type: SETTINGS_ACTIONS.EDIT,
            field: SETTINGS_FIELDS.EDIT_SHIPPING_PROFILE,
            value: { ...initialProfileStates.profile, id: 1, profileName: 'test' },
          });

          expect(actual).toEqual(start);
        });

        test('shipping profile', () => {
          const start = [
            {
              ...initialTaskStates.task,
              id: 'task1',
              index: 1,
            },
            {
              ...initialTaskStates.task,
              id: 'task3',
              index: 3,
            },
          ];

          const actual = taskListReducer(start, {
            type: SETTINGS_ACTIONS.EDIT,
            field: SETTINGS_FIELDS.EDIT_SHIPPING_SITE,
            value: {
              label: 'Nebula Bots',
              value: 'https://nebulabots.com',
              apiKey: '6526a5b5393b6316a64853cfe091841c',
              auth: false,
              supported: true,
            },
          });

          expect(actual).toEqual(start);
        });

        test('shipping username', () => {
          const start = [
            {
              ...initialTaskStates.task,
              id: 'task1',
              index: 1,
            },
            {
              ...initialTaskStates.task,
              id: 'task3',
              index: 3,
            },
          ];

          const actual = taskListReducer(start, {
            type: SETTINGS_ACTIONS.EDIT,
            field: SETTINGS_FIELDS.EDIT_SHIPPING_USERNAME,
            value: 'test',
          });

          expect(actual).toEqual(start);
        });

        test('shipping password', () => {
          const start = [
            {
              ...initialTaskStates.task,
              id: 'task1',
              index: 1,
            },
            {
              ...initialTaskStates.task,
              id: 'task3',
              index: 3,
            },
          ];

          const actual = taskListReducer(start, {
            type: SETTINGS_ACTIONS.EDIT,
            field: SETTINGS_FIELDS.EDIT_SHIPPING_PASSWORD,
            value: 'test',
          });

          expect(actual).toEqual(start);
        });
      });
    });

    describe('when editing profile fields', () => {
      test('adding a profile', () => {
        const start = [
          {
            ...initialTaskStates.task,
            id: 'task1',
            index: 1,
            profile: {
              ...initialProfileStates.profile,
              id: 1,
              profileName: 'not test',
            },
          },
          {
            ...initialTaskStates.task,
            id: 'task3',
            index: 3,
            profile: {
              ...initialProfileStates.profile,
              id: 2,
            },
          },
        ];

        const expected = [
          {
            ...initialTaskStates.task,
            id: 'task1',
            index: 1,
            profile: {
              ...initialProfileStates.profile,
              id: 1,
              profileName: 'test',
            },
          },
          {
            ...initialTaskStates.task,
            id: 'task3',
            index: 3,
            profile: {
              ...initialProfileStates.profile,
              id: 2,
            },
          },
        ];

        const actual = taskListReducer(start, {
          type: PROFILE_ACTIONS.ADD,
          profile: { ...initialProfileStates.profile, id: 1, profileName: 'test' },
        });

        expect(actual).toEqual(expected);
      });

      test('updating a profile', () => {
        const start = [
          {
            ...initialTaskStates.task,
            id: 'task1',
            index: 1,
            profile: {
              ...initialProfileStates.profile,
              id: 1,
              profileName: 'not test',
            },
          },
          {
            ...initialTaskStates.task,
            id: 'task3',
            index: 3,
            profile: {
              ...initialProfileStates.profile,
              id: 2,
            },
          },
        ];

        const expected = [
          {
            ...initialTaskStates.task,
            id: 'task1',
            index: 1,
            profile: {
              ...initialProfileStates.profile,
              id: 1,
              profileName: 'test',
            },
          },
          {
            ...initialTaskStates.task,
            id: 'task3',
            index: 3,
            profile: {
              ...initialProfileStates.profile,
              id: 2,
            },
          },
        ];

        const actual = taskListReducer(start, {
          type: PROFILE_ACTIONS.UPDATE,
          profile: { ...initialProfileStates.profile, id: 1, profileName: 'test' },
        });

        expect(actual).toEqual(expected);
      });

      test('no operation when no profile is passed along', () => {
        const start = [
          {
            ...initialTaskStates.task,
            id: 'task1',
            index: 1,
            profile: {
              ...initialProfileStates.profile,
              id: 1,
              profileName: 'not test',
            },
          },
          {
            ...initialTaskStates.task,
            id: 'task3',
            index: 3,
            profile: {
              ...initialProfileStates.profile,
              id: 2,
            },
          },
        ];

        const actual = taskListReducer(start, {
          type: PROFILE_ACTIONS.ADD,
          profile: null,
        });

        expect(actual).toEqual(start);
      });

      test('removing a profile with tasks using that profile', () => {
        const start = [
          {
            ...initialTaskStates.task,
            id: 'task1',
            index: 1,
            profile: {
              ...initialProfileStates.profile,
              id: 1,
              profileName: 'not test',
            },
          },
          {
            ...initialTaskStates.task,
            id: 'task3',
            index: 3,
            profile: {
              ...initialProfileStates.profile,
              id: 2,
            },
          },
        ];

        const expected = [
          {
            ...initialTaskStates.task,
            id: 'task3',
            index: 3,
            profile: {
              ...initialProfileStates.profile,
              id: 2,
            },
          },
        ];

        const actual = taskListReducer(start, {
          type: PROFILE_ACTIONS.REMOVE,
          id: 1,
        });

        expect(actual).toEqual(expected);
      });

      test('removing a profile with tasks using that profile', () => {
        const start = [
          {
            ...initialTaskStates.task,
            id: 'task1',
            index: 1,
            profile: {
              ...initialProfileStates.profile,
              id: 2,
              profileName: 'not test',
            },
          },
          {
            ...initialTaskStates.task,
            id: 'task3',
            index: 3,
            profile: {
              ...initialProfileStates.profile,
              id: 2,
              profileName: 'not test',
            },
          },
        ];

        const actual = taskListReducer(start, {
          type: PROFILE_ACTIONS.REMOVE,
          id: 1,
        });

        expect(actual).toEqual(start);
      });
    });
  });

  describe('should handle add', () => {
    describe('when valid action is formed to', () => {
      let initialValues;
      let update;
      let expectedBase;

      beforeEach(() => {
        initialValues = {
          profile: {},
          product: {},
          sizes: [],
          site: {},
          username: 'test',
          password: 'test',
        };
        update = {
          ...initialTaskStates.task,
          ...initialValues,
        };
        expectedBase = {
          ...update,
          edits: {
            ...initialTaskStates.edit,
            ...initialValues,
          },
        };
      });

      test('add a new task to an empty list', () => {
        const expected = [
          {
            ...expectedBase,
            id: expect.any(String),
            index: 1,
          },
        ];
        const actual = taskListReducer([], {
          type: TASK_ACTIONS.ADD,
          response: {
            task: update,
          },
        });
        expect(actual).toEqual(expected);
      });

      test('add a new task to an existing list', () => {
        const start = [
          {
            ...initialTaskStates.task,
            id: 'task1',
            index: 1,
          },
        ];
        const expected = [
          {
            ...initialTaskStates.task,
            id: 'task1',
            index: 1,
          },
          {
            ...expectedBase,
            id: expect.any(String),
            index: 2,
          },
        ];
        const actual = taskListReducer(start, {
          type: TASK_ACTIONS.ADD,
          response: {
            task: update,
          },
        });
        expect(actual).toEqual(expected);
      });

      test('add a new task to an existing list with holes', () => {
        const start = [
          {
            ...initialTaskStates.task,
            id: 'task1',
            index: 1,
          },
          {
            ...initialTaskStates.task,
            id: 'task3',
            index: 3,
          },
        ];
        const expected = [
          {
            ...initialTaskStates.task,
            id: 'task1',
            index: 1,
          },
          {
            ...initialTaskStates.task,
            id: 'task3',
            index: 3,
          },
          {
            ...expectedBase,
            id: expect.any(String),
            index: 2,
          },
        ];
        const actual = taskListReducer(start, {
          type: TASK_ACTIONS.ADD,
          response: {
            task: update,
          },
        });
        expect(actual).toEqual(expected);
      });
    });

    describe('when invalid action is formed because', () => {
      const testNoop = payload => {
        const actual = taskListReducer([], {
          type: TASK_ACTIONS.ADD,
          ...payload,
        });
        expect(actual).toEqual([]);
      };

      test('when task is null', () => {
        testNoop({
          response: { task: null },
        });
      });

      test('when task is not given', () => {
        testNoop({
          response: {},
        });
      });

      test('when errors map exists', () => {
        testNoop({
          response: { task: { ...initialTaskStates.task } },
          errors: {},
        });
      });

      test('when response is null', () => {
        testNoop({
          response: null,
        });
      });

      test('when response is not given', () => {
        testNoop({});
      });
    });
  });

  describe('should handle remove', () => {
    describe('when valid action is formed to', () => {
      test('delete a specific id', () => {
        const start = [
          {
            ...initialTaskStates.task,
            id: 'task1',
            index: 1,
            username: 'test1',
          },
          {
            ...initialTaskStates.task,
            id: 'task2',
            index: 2,
            username: 'test2',
          },
          {
            ...initialTaskStates.task,
            id: 'task3',
            index: 3,
            username: 'test3',
          },
        ];
        const expected = JSON.parse(JSON.stringify(start));
        expected.splice(1, 1);
        expected[1].id = 'task3';
        expected[1].index = 3;
        const actual = taskListReducer(start, {
          type: TASK_ACTIONS.REMOVE,
          response: { task: { id: 'task2' } },
        });
        expect(actual).toEqual(expected);
      });

      test('to delete all tasks', () => {
        const start = [
          {
            ...initialTaskStates.task,
            id: 1,
          },
        ];
        const expected = [];
        const actual = taskListReducer(start, {
          type: TASK_ACTIONS.REMOVE,
          response: { task: null },
        });
        expect(actual).toEqual(expected);
      });
    });

    describe('when invalid action is formed because', () => {
      const testNoop = payload => {
        const start = [
          {
            ...initialTaskStates.task,
            id: 1,
          },
        ];
        const expected = JSON.parse(JSON.stringify(start));
        const actual = taskListReducer(start, {
          type: TASK_ACTIONS.REMOVE,
          ...payload,
        });
        expect(actual).toEqual(expected);
      };

      test('task is not given', () => {
        testNoop({
          response: {},
        });
      });

      test('when errors map exists', () => {
        testNoop({
          errors: {},
        });
      });

      test('response is null', () => {
        testNoop({
          response: null,
        });
      });

      test('response is not given', () => {
        testNoop({});
      });
    });
  });

  describe('should handle copy', () => {
    describe('when valid action is formed to', () => {
      test('copy a specific task', () => {
        const start = [
          {
            ...initialTaskStates.task,
            id: 'task1',
            index: 1,
            username: 'test1',
          },
          {
            ...initialTaskStates.task,
            id: 'task2',
            index: 2,
            username: 'test2',
          },
          {
            ...initialTaskStates.task,
            id: 'task3',
            index: 3,
            username: 'test3',
          },
        ];

        const expected = [
          {
            ...initialTaskStates.task,
            id: 'task1',
            index: 1,
            username: 'test1',
          },
          {
            ...initialTaskStates.task,
            id: 'task2',
            index: 2,
            username: 'test2',
          },
          {
            ...initialTaskStates.task,
            id: 'task3',
            index: 3,
            username: 'test3',
          },
          {
            ...initialTaskStates.task,
            id: expect.any(String),
            index: 4,
            username: 'test2',
          },
        ];
        const actual = taskListReducer(start, {
          type: TASK_ACTIONS.COPY,
          response: {
            task: {
              ...initialTaskStates.task,
              id: 'task2',
              index: 2,
              username: 'test2',
            },
          },
        });
        expect(actual).toEqual(expected);
      });
    });

    describe('when invalid action is formed because', () => {
      const testNoop = payload => {
        const start = [
          {
            ...initialTaskStates.task,
            id: 1,
          },
        ];
        const expected = JSON.parse(JSON.stringify(start));
        const actual = taskListReducer(start, {
          type: TASK_ACTIONS.COPY,
          ...payload,
        });
        expect(actual).toEqual(expected);
      };

      test('task is not given', () => {
        testNoop({
          response: {},
        });
      });

      test('when errors map exists', () => {
        testNoop({
          errors: {},
        });
      });

      test('response is null', () => {
        testNoop({
          response: null,
        });
      });

      test('response is not given', () => {
        testNoop({});
      });
    });
  });

  describe('should handle update', () => {
    describe('when valid action is formed to', () => {
      const testValid = edits => {
        const initialValues = {
          username: 'username',
          password: 'password',
          profile: {},
          product: {},
          sizes: [],
          site: {},
        };
        const start = [
          {
            ...initialTaskStates.task,
            ...initialValues,
            id: 1,
          },
        ];
        const update = {
          ...start[0],
          edits: {
            ...initialTaskStates.edit,
            ...edits,
          },
        };
        const expected = [
          {
            ...update,
            ...edits,
            edits: {
              ...update.edits,
              ...initialValues,
              ...edits,
            },
          },
        ];
        const actual = taskListReducer(start, {
          type: TASK_ACTIONS.UPDATE,
          response: { id: 1, task: update },
        });
        expect(actual).toEqual(expected);
      };

      test('update username', () => {
        const edits = {
          username: 'test',
        };
        testValid(edits);
      });

      test('update password', () => {
        const edits = {
          password: 'test',
        };
        testValid(edits);
      });

      test('update profile', () => {
        const edits = {
          profile: { id: 2 },
        };
        testValid(edits);
      });

      test('update product', () => {
        const edits = {
          product: { id: 3 },
        };
        testValid(edits);
      });

      test('update site', () => {
        const edits = {
          site: { url: 'test' },
        };
        testValid(edits);
      });

      test('update sizes', () => {
        const edits = {
          sizes: [{ name: 'test' }],
        };
        testValid(edits);
      });

      test('update all', () => {
        const edits = {
          username: 'test',
          password: 'test',
          profile: { id: 2 },
          product: { id: 3 },
          site: { url: 'test' },
          sizes: [{ name: 'test' }],
        };
        testValid(edits);
      });

      test('clear all', () => {
        const initialValues = {
          username: 'username',
          password: 'password',
          profile: {},
          product: {},
          sizes: [],
          site: {},
        };
        const start = [
          {
            ...initialTaskStates.task,
            ...initialValues,
            id: 1,
          },
        ];
        const update = {
          ...start[0],
          edits: null,
        };
        const expected = [
          {
            ...update,
            edits: {
              ...start[0].edits,
              ...initialValues,
            },
          },
        ];
        const actual = taskListReducer(start, {
          type: TASK_ACTIONS.UPDATE,
          response: { id: 1, task: update },
        });
        expect(actual).toEqual(expected);
      });
    });

    describe('when invalid action is formed because', () => {
      const testNoop = payload => {
        const start = [
          {
            ...initialTaskStates.task,
            id: 1,
            username: 'username',
            password: 'password',
            profile: {},
            product: {},
            sizes: [],
            site: {},
          },
        ];
        const expected = JSON.parse(JSON.stringify(start));
        const actual = taskListReducer(start, {
          ...payload,
          type: TASK_ACTIONS.UPDATE,
        });
        expect(actual).toEqual(expected);
      };

      test('id is null', () => {
        const edits = {
          username: 'test',
          password: 'test',
          profile: { id: 2 },
          product: { id: 3 },
          sizes: [{ name: 'test' }],
          site: { name: 'test' },
        };
        const update = {
          ...initialTaskStates.task,
          edits: {
            ...initialTaskStates.edit,
            ...edits,
          },
        };
        testNoop({
          response: { id: null, task: update },
        });
      });

      test('id is not given', () => {
        const edits = {
          username: 'test',
          password: 'test',
          profile: { id: 2 },
          product: { id: 3 },
          sizes: [{ name: 'test' }],
          site: { name: 'test' },
        };
        const update = {
          ...initialTaskStates.task,
          edits: {
            ...initialTaskStates.edit,
            ...edits,
          },
        };
        testNoop({
          response: { task: update },
        });
      });

      test('id is not given', () => {
        const edits = {
          username: 'test',
          password: 'test',
          profile: { id: 2 },
          product: { id: 3 },
          sizes: [{ name: 'test' }],
          site: { name: 'test' },
        };
        const update = {
          ...initialTaskStates.task,
          edits: {
            ...initialTaskStates.edit,
            ...edits,
          },
        };
        testNoop({
          response: { id: 39, task: update },
        });
      });

      test('task is null', () => {
        testNoop({
          response: { id: 1, task: null },
        });
      });

      test('task is not given', () => {
        testNoop({
          response: { id: 1 },
        });
      });

      test('when errors map exists', () => {
        testNoop({
          errors: {},
        });
      });

      test('response is null', () => {
        testNoop({
          response: null,
        });
      });

      test('response is not given', () => {
        testNoop({});
      });
    });

    test('when clearing edits', () => {});
  });

  describe('should handle status', () => {
    test('when valid action is given', () => {
      const start = [
        {
          ...initialTaskStates.task,
          id: 1,
          output: 'testOutput',
        },
      ];
      const expected = JSON.parse(JSON.stringify(start));
      expected[0].output = 'testing...';
      const actual = taskListReducer(start, {
        type: TASK_ACTIONS.STATUS,
        response: {
          id: 1,
          message: 'testing...',
        },
      });
      expect(actual).toEqual(expected);
    });

    test('when given task is not found', () => {
      const start = [
        {
          ...initialTaskStates.task,
          id: 1,
          output: 'testOutput',
        },
      ];
      const actual = taskListReducer(start, {
        type: TASK_ACTIONS.STATUS,
        response: {
          id: 4,
          message: 'testing...',
        },
      });
      expect(actual).toEqual(start);
    });

    test('when null id is given', () => {
      const start = [
        {
          ...initialTaskStates.task,
          id: 1,
          output: 'testOutput',
        },
      ];
      const actual = taskListReducer(start, {
        type: TASK_ACTIONS.STATUS,
        response: {
          id: null,
          message: 'testing...',
        },
      });
      expect(actual).toEqual(start);
    });

    test('when no id is given', () => {
      const start = [
        {
          ...initialTaskStates.task,
          id: 1,
          output: 'testOutput',
        },
      ];
      const actual = taskListReducer(start, {
        type: TASK_ACTIONS.STATUS,
        response: {
          message: 'testing...',
        },
      });
      expect(actual).toEqual(start);
    });

    test('when null message is given', () => {
      const start = [
        {
          ...initialTaskStates.task,
          id: 1,
          output: 'testOutput',
        },
      ];
      const actual = taskListReducer(start, {
        type: TASK_ACTIONS.STATUS,
        response: {
          id: 1,
          message: null,
        },
      });
      expect(actual).toEqual(start);
    });

    test('when no message is given', () => {
      const start = [
        {
          ...initialTaskStates.task,
          id: 1,
          output: 'testOutput',
        },
      ];
      const actual = taskListReducer(start, {
        type: TASK_ACTIONS.STATUS,
        response: {
          id: 1,
        },
      });
      expect(actual).toEqual(start);
    });
  });

  describe('should handle edit', () => {
    test('when valid action is given', () => {
      const start = [
        {
          ...initialTaskStates.task,
          id: 1,
          username: 'username',
        },
      ];
      const expected = JSON.parse(JSON.stringify(start));
      expected[0].edits.username = 'testing';
      const actual = taskListReducer(start, {
        type: TASK_ACTIONS.EDIT,
        id: 1,
        field: TASK_FIELDS.EDIT_USERNAME,
        value: 'testing',
      });
      expect(actual).toEqual(expected);
    });

    test('when given task is not found', () => {
      const start = [
        {
          ...initialTaskStates.task,
          id: 1,
          username: 'username',
        },
      ];
      const expected = JSON.parse(JSON.stringify(start));
      const actual = taskListReducer(start, {
        type: TASK_ACTIONS.EDIT,
        id: 2,
        field: TASK_FIELDS.EDIT_USERNAME,
        value: 'testing',
      });
      expect(actual).toEqual(expected);
    });

    test('when null id is given', () => {
      const start = [
        {
          ...initialTaskStates.task,
          id: 1,
          username: 'username',
        },
      ];
      const expected = JSON.parse(JSON.stringify(start));
      const actual = taskListReducer(start, {
        type: TASK_ACTIONS.EDIT,
        field: TASK_FIELDS.EDIT_USERNAME,
        id: null,
        value: 'testing',
      });
      expect(actual).toEqual(expected);
    });

    test('when no id is given', () => {
      const start = [
        {
          ...initialTaskStates.task,
          id: 1,
          username: 'username',
        },
      ];
      const expected = JSON.parse(JSON.stringify(start));
      const actual = taskListReducer(start, {
        type: TASK_ACTIONS.EDIT,
        field: TASK_FIELDS.EDIT_USERNAME,
        value: 'testing',
      });
      expect(actual).toEqual(expected);
    });

    test('when no field is given', () => {
      const start = [
        {
          ...initialTaskStates.task,
          id: 1,
          username: 'username',
        },
      ];
      const expected = JSON.parse(JSON.stringify(start));
      const actual = taskListReducer(start, {
        type: TASK_ACTIONS.EDIT,
        id: 1,
        value: 'testing',
      });
      expect(actual).toEqual(expected);
    });

    test('when invalid field is given', () => {
      const start = [
        {
          ...initialTaskStates.task,
          id: 1,
          username: 'username',
        },
      ];
      const expected = JSON.parse(JSON.stringify(start));
      const actual = taskListReducer(start, {
        type: TASK_ACTIONS.EDIT,
        id: 1,
        field: 'INVALID',
        value: 'testing',
      });
      expect(actual).toEqual(expected);
    });
  });

  describe('should handle start', () => {
    test('when given task is running', () => {
      const start = [
        {
          ...initialTaskStates.task,
          id: 1,
          status: 'running',
        },
      ];
      const expected = JSON.parse(JSON.stringify(start));
      expected[0].status = 'running';
      const actual = taskListReducer(start, {
        type: TASK_ACTIONS.START,
        response: {
          task: { id: 1 },
        },
      });
      expect(actual).toEqual(expected);
    });

    test('when given task is stopped', () => {
      const start = [
        {
          ...initialTaskStates.task,
          id: 1,
          status: 'stopped',
        },
      ];
      const expected = JSON.parse(JSON.stringify(start));
      expected[0].status = 'running';
      expected[0].output = 'Starting task!';
      const actual = taskListReducer(start, {
        type: TASK_ACTIONS.START,
        response: {
          task: { id: 1 },
        },
      });
      expect(actual).toEqual(expected);
    });

    test('when given task is idle', () => {
      const start = [
        {
          ...initialTaskStates.task,
          id: 1,
          status: 'idle',
        },
      ];
      const expected = JSON.parse(JSON.stringify(start));
      expected[0].status = 'running';
      expected[0].output = 'Starting task!';
      const actual = taskListReducer(start, {
        type: TASK_ACTIONS.START,
        response: {
          task: { id: 1 },
        },
      });
      expect(actual).toEqual(expected);
    });

    test('when given task is not found', () => {
      const start = [
        {
          ...initialTaskStates.task,
          id: 1,
          status: 'stopped',
        },
      ];
      const expected = JSON.parse(JSON.stringify(start));
      const actual = taskListReducer(start, {
        type: TASK_ACTIONS.START,
        response: {
          task: { id: 2 },
        },
      });
      expect(actual).toEqual(expected);
    });

    test('when no task is given', () => {
      const start = [
        {
          ...initialTaskStates.task,
          id: 1,
          status: 'stopped',
        },
      ];
      const expected = JSON.parse(JSON.stringify(start));
      const actual = taskListReducer(start, {
        type: TASK_ACTIONS.START,
        response: {},
      });
      expect(actual).toEqual(expected);
    });

    test('when no response is given', () => {
      const start = [
        {
          ...initialTaskStates.task,
          id: 1,
          status: 'stopped',
        },
      ];
      const expected = JSON.parse(JSON.stringify(start));
      const actual = taskListReducer(start, {
        type: TASK_ACTIONS.START,
      });
      expect(actual).toEqual(expected);
    });
  });

  describe('should handle stop', () => {
    test('when given task is running', () => {
      const start = [
        {
          ...initialTaskStates.task,
          id: 1,
          status: 'running',
        },
      ];
      const expected = JSON.parse(JSON.stringify(start));
      expected[0].status = 'stopped';
      expected[0].output = 'Stopping task...';
      const actual = taskListReducer(start, {
        type: TASK_ACTIONS.STOP,
        response: {
          task: { id: 1 },
        },
      });
      expect(actual).toEqual(expected);
    });

    test('when given task is stopped', () => {
      const start = [
        {
          ...initialTaskStates.task,
          id: 1,
          status: 'stopped',
        },
      ];
      const expected = JSON.parse(JSON.stringify(start));
      expected[0].status = 'stopped';
      const actual = taskListReducer(start, {
        type: TASK_ACTIONS.STOP,
        response: {
          task: { id: 1 },
        },
      });
      expect(actual).toEqual(expected);
    });

    test('when given task is idle', () => {
      const start = [
        {
          ...initialTaskStates.task,
          id: 1,
          status: 'idle',
        },
      ];
      const expected = JSON.parse(JSON.stringify(start));
      const actual = taskListReducer(start, {
        type: TASK_ACTIONS.STOP,
        response: {
          task: { id: 1 },
        },
      });
      expect(actual).toEqual(expected);
    });

    test('when given task is not found', () => {
      const start = [
        {
          ...initialTaskStates.task,
          id: 1,
          status: 'running',
        },
      ];
      const expected = JSON.parse(JSON.stringify(start));
      const actual = taskListReducer(start, {
        type: TASK_ACTIONS.STOP,
        response: {
          task: { id: 2 },
        },
      });
      expect(actual).toEqual(expected);
    });

    test('when no task is given', () => {
      const start = [
        {
          ...initialTaskStates.task,
          id: 1,
          status: 'running',
        },
      ];
      const expected = JSON.parse(JSON.stringify(start));
      const actual = taskListReducer(start, {
        type: TASK_ACTIONS.STOP,
        response: {},
      });
      expect(actual).toEqual(expected);
    });

    test('when no response is given', () => {
      const start = [
        {
          ...initialTaskStates.task,
          id: 1,
          status: 'running',
        },
      ];
      const expected = JSON.parse(JSON.stringify(start));
      const actual = taskListReducer(start, {
        type: TASK_ACTIONS.STOP,
      });
      expect(actual).toEqual(expected);
    });
  });

  describe('should handle error', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    taskListReducer(initialTaskStates.list, { type: TASK_ACTIONS.ERROR });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  describe('should not respond to', () => {
    const _testNoopResponse = type => {
      const actual = taskListReducer(initialTaskStates.list, { type });
      expect(actual).toEqual(initialTaskStates.list);
    };

    test('select action', () => {
      _testNoopResponse(TASK_ACTIONS.SELECT);
    });

    test('invalid type', () => {
      _testNoopResponse('INVALID');
    });
  });
});
