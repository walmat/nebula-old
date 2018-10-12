/* global describe expect it test jest */
import { newTaskReducer } from '../../../../state/reducers/tasks/taskReducer';
import { initialTaskStates } from '../../../../utils/definitions/taskDefinitions';
import {
  TASK_ACTIONS,
  TASK_FIELDS,
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
      const actual = newTaskReducer(
        initialTaskStates.task,
        {
          type: TASK_ACTIONS.EDIT, id: null, field: TASK_FIELDS.EDIT_USERNAME, value: 'test',
        },
      );
      expect(actual).toEqual(expected);
    });

    test('when id is non-null', () => {
      const actual = newTaskReducer(
        initialTaskStates.task,
        {
          type: TASK_ACTIONS.EDIT, id: 1, field: TASK_FIELDS.EDIT_USERNAME, value: 'test',
        },
      );
      expect(actual).toEqual(initialTaskStates.task);
    });

    test('when field is not given', () => {
      const actual = newTaskReducer(
        initialTaskStates.task,
        {
          type: TASK_ACTIONS.EDIT, id: null, value: 'test',
        },
      );
      expect(actual).toEqual(initialTaskStates.task);
    });

    test('when field is invalid', () => {
      const actual = newTaskReducer(
        initialTaskStates.task,
        {
          type: TASK_ACTIONS.EDIT, id: null, field: 'INVALID', value: 'test',
        },
      );
      expect(actual).toEqual(initialTaskStates.task);
    });

    test('when value is not given', () => {
      const actual = newTaskReducer(
        initialTaskStates.task,
        {
          type: TASK_ACTIONS.EDIT, id: null, field: TASK_FIELDS.EDIT_USERNAME,
        },
      );
      expect(actual).toEqual(initialTaskStates.task);
    });
  });

  describe('should handle add', () => {
    test('when action is valid', () => {
      const start = {
        ...initialTaskStates.task,
        username: 'test',
      };
      const actual = newTaskReducer(
        start,
        { type: TASK_ACTIONS.ADD, response: { task: {} } },
      );
      expect(actual).toEqual(initialTaskStates.task);
    });

    test('when task is not given', () => {
      const start = {
        ...initialTaskStates.task,
        username: 'test',
      };
      const actual = newTaskReducer(
        start,
        { type: TASK_ACTIONS.ADD, response: {} },
      );
      expect(actual).toEqual(start);
    });

    test('when response is not given', () => {
      const start = {
        ...initialTaskStates.task,
        username: 'test',
      };
      const actual = newTaskReducer(
        start,
        { type: TASK_ACTIONS.ADD },
      );
      expect(actual).toEqual(start);
    });
  });

  describe('should not respond to', () => {
    const _testNoopResponse = (type) => {
      const actual = newTaskReducer(
        initialTaskStates.task,
        { type },
      );
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
