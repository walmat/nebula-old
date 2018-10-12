/* global describe expect it test jest */
import { selectedTaskReducer } from '../../../../state/reducers/tasks/taskReducer';
import { initialTaskStates } from '../../../../utils/definitions/taskDefinitions';
import {
  TASK_ACTIONS,
  TASK_FIELDS,
} from '../../../../state/actions';

describe('selected task reducer', () => {
  it('should return initial state', () => {
    const actual = selectedTaskReducer(undefined, {});
    expect(actual).toEqual(initialTaskStates.task);
  });

  describe('should handle select', () => {
    test('when action is valid', () => {
      const expected = {
        ...initialTaskStates.task,
        id: 1,
        username: 'test',
      };
      const actual = selectedTaskReducer(
        initialTaskStates.task,
        {
          type: TASK_ACTIONS.SELECT, task: expected,
        },
      );
      expect(actual).toEqual(expected);
    });

    test('when task is not given', () => {
      const actual = selectedTaskReducer(
        initialTaskStates.task,
        { type: TASK_ACTIONS.SELECT },
      );
      expect(actual).toEqual(initialTaskStates.task);
    });
  });

  describe('should not respond to', () => {
    const _testNoopResponse = (type) => {
      const actual = selectedTaskReducer(
        initialTaskStates.task,
        { type },
      );
      expect(actual).toEqual(initialTaskStates.task);
    };

    test('add action', () => {
      _testNoopResponse(TASK_ACTIONS.ADD);
    });

    test('destroy action', () => {
      _testNoopResponse(TASK_ACTIONS.REMOVE);
    });

    test('edit action', () => {
      _testNoopResponse(TASK_ACTIONS.EDIT);
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
