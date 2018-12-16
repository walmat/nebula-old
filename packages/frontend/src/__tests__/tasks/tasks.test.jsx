/* global describe it expect beforeEach jest test */
import React from 'react';
import { shallow } from 'enzyme';

import { TasksPrimitive, mapStateToProps, mapDispatchToProps } from '../../tasks/tasks';
import CreateTask from '../../tasks/createTask';
import ViewTask from '../../tasks/viewTask';
import LogTask from '../../tasks/logTask';
import { initialTaskStates } from '../../utils/definitions/taskDefinitions';

import getByTestId from '../../__testUtils__/getByTestId';

describe('<Tasks />', () => {
  let defaultProps;

  const renderShallowWithProps = customProps => {
    const renderProps = {
      ...defaultProps,
      ...customProps,
    };
    return shallow(
      <TasksPrimitive
        newTask={renderProps.newTask}
        tasks={renderProps.tasks}
        proxies={renderProps.proxies}
        onDestroyTask={renderProps.onDestroyTask}
        onStartTask={renderProps.onStartTask}
        onStopTask={renderProps.onStopTask}
        onKeyPress={renderProps.onKeyPress}
      />,
    );
  };

  beforeEach(() => {
    defaultProps = {
      newTask: {
        ...initialTaskStates.task,
      },
      tasks: [],
      proxies: [],
      onDestroyTask: () => {},
      onStartTask: () => {},
      onStopTask: () => {},
    };
  });

  it('should render correctly with default props', () => {
    const wrapper = renderShallowWithProps();
    // Top Level
    expect(wrapper.find('.tasks__title')).toHaveLength(1);
    expect(wrapper.find('.tasks__title').text()).toBe('Tasks');
    // Create Task
    expect(wrapper.find('.tasks-create__section-header')).toHaveLength(1);
    expect(wrapper.find('.tasks-create__section-header').text()).toBe('Create');
    expect(wrapper.find(CreateTask)).toHaveLength(1);
    expect(wrapper.find(CreateTask).prop('taskToEdit')).toEqual(defaultProps.newTask);
    // Log Task
    expect(wrapper.find('.tasks-log__section-header')).toHaveLength(1);
    expect(wrapper.find('.tasks-log__section-header').text()).toBe('Log');
    expect(wrapper.find(LogTask)).toHaveLength(1);
    // View Task
    expect(wrapper.find('.tasks-table__section-header')).toHaveLength(1);
    expect(wrapper.find('.tasks-table__section-header').text()).toBe('View');
    expect(wrapper.find(ViewTask)).toHaveLength(1);
    // Bulk Action Buttons
    expect(getByTestId(wrapper, 'Tasks.bulkActionButton.start')).toHaveLength(1);
    expect(getByTestId(wrapper, 'Tasks.bulkActionButton.stop')).toHaveLength(1);
    expect(getByTestId(wrapper, 'Tasks.bulkActionButton.destroy')).toHaveLength(1);
    getByTestId(wrapper, 'Tasks.bulkActionButton.start').simulate('keyPress');
  });

  describe('bulk actions buttons', () => {
    describe('start', () => {
      it('should render with default properties', () => {
        const wrapper = renderShallowWithProps();
        const button = getByTestId(wrapper, 'Tasks.bulkActionButton.start');
        expect(button.prop('className')).toBe('bulk-action-sidebar__button');
        expect(button.prop('role')).toBe('button');
        expect(button.prop('onKeyPress')).toBeDefined();
        expect(button.prop('onClick')).toBeDefined();
      });

      it('should respond to events', () => {
        const customProps = {
          tasks: [
            { ...initialTaskStates.task, id: 1 },
            { ...initialTaskStates.task, id: 2 },
            { ...initialTaskStates.task, id: 3 },
          ],
          proxies: ['test proxies'],
          onStartTask: jest.fn(),
          onKeyPress: jest.fn(),
        };
        const wrapper = renderShallowWithProps(customProps);
        const button = getByTestId(wrapper, 'Tasks.bulkActionButton.start');
        button.simulate('keyPress');
        expect(customProps.onKeyPress).toHaveBeenCalled();
        button.simulate('click');
        expect(customProps.onStartTask).toHaveBeenCalledTimes(3);
        expect(customProps.onStartTask).toHaveBeenNthCalledWith(
          1,
          customProps.tasks[0],
          customProps.proxies,
        );
        expect(customProps.onStartTask).toHaveBeenNthCalledWith(
          2,
          customProps.tasks[1],
          customProps.proxies,
        );
        expect(customProps.onStartTask).toHaveBeenNthCalledWith(
          3,
          customProps.tasks[2],
          customProps.proxies,
        );
      });

      it('should not call start task if tasks is empty', () => {
        const customProps = {
          tasks: [],
          proxies: ['test proxies'],
          onStartTask: jest.fn(),
        };
        const wrapper = renderShallowWithProps(customProps);
        const button = getByTestId(wrapper, 'Tasks.bulkActionButton.start');
        button.simulate('click');
        expect(customProps.onStartTask).not.toHaveBeenCalled();
      });
    });

    describe('stop', () => {
      it('should render with default properties', () => {
        const wrapper = renderShallowWithProps();
        const button = getByTestId(wrapper, 'Tasks.bulkActionButton.stop');
        expect(button.prop('className')).toBe('bulk-action-sidebar__button');
        expect(button.prop('role')).toBe('button');
        expect(button.prop('onKeyPress')).toBeDefined();
        expect(button.prop('onClick')).toBeDefined();
      });

      it('should respond to events', () => {
        const customProps = {
          tasks: [
            { ...initialTaskStates.task, id: 1 },
            { ...initialTaskStates.task, id: 2 },
            { ...initialTaskStates.task, id: 3 },
          ],
          onStopTask: jest.fn(),
          onKeyPress: jest.fn(),
        };
        const wrapper = renderShallowWithProps(customProps);
        const button = getByTestId(wrapper, 'Tasks.bulkActionButton.stop');
        button.simulate('keyPress');
        expect(customProps.onKeyPress).toHaveBeenCalled();
        button.simulate('click');
        expect(customProps.onStopTask).toHaveBeenCalledTimes(3);
        expect(customProps.onStopTask).toHaveBeenNthCalledWith(1, customProps.tasks[0]);
        expect(customProps.onStopTask).toHaveBeenNthCalledWith(2, customProps.tasks[1]);
        expect(customProps.onStopTask).toHaveBeenNthCalledWith(3, customProps.tasks[2]);
      });

      it('should not call start task if tasks is empty', () => {
        const customProps = {
          tasks: [],
          onStopTask: jest.fn(),
        };
        const wrapper = renderShallowWithProps(customProps);
        const button = getByTestId(wrapper, 'Tasks.bulkActionButton.stop');
        button.simulate('click');
        expect(customProps.onStopTask).not.toHaveBeenCalled();
      });
    });

    describe('destroy', () => {
      it('should render with default properties', () => {
        const wrapper = renderShallowWithProps();
        const button = getByTestId(wrapper, 'Tasks.bulkActionButton.destroy');
        expect(button.prop('className')).toBe('bulk-action-sidebar__button');
        expect(button.prop('role')).toBe('button');
        expect(button.prop('onKeyPress')).toBeDefined();
        expect(button.prop('onClick')).toBeDefined();
      });

      it('should respond to events', () => {
        const customProps = {
          tasks: [
            { ...initialTaskStates.task, id: 1 },
            { ...initialTaskStates.task, id: 2 },
            { ...initialTaskStates.task, id: 3 },
          ],
          onDestroyTask: jest.fn(),
          onKeyPress: jest.fn(),
        };
        const wrapper = renderShallowWithProps(customProps);
        const button = getByTestId(wrapper, 'Tasks.bulkActionButton.destroy');
        button.simulate('keyPress');
        expect(customProps.onKeyPress).toHaveBeenCalled();
        button.simulate('click');
        expect(customProps.onDestroyTask).toHaveBeenCalledTimes(3);
        expect(customProps.onDestroyTask).toHaveBeenNthCalledWith(1, customProps.tasks[0]);
        expect(customProps.onDestroyTask).toHaveBeenNthCalledWith(2, customProps.tasks[1]);
        expect(customProps.onDestroyTask).toHaveBeenNthCalledWith(3, customProps.tasks[2]);
      });

      it('should not call start task if tasks is empty', () => {
        const customProps = {
          tasks: [],
          onDestroyTask: jest.fn(),
        };
        const wrapper = renderShallowWithProps(customProps);
        const button = getByTestId(wrapper, 'Tasks.bulkActionButton.destroy');
        button.simulate('click');
        expect(customProps.onDestroyTask).not.toHaveBeenCalled();
      });
    });
  });

  test('map state to props returns correct structure', () => {
    const state = {
      newTask: {
        ...initialTaskStates.task,
      },
      task: 'invalid',
      tasks: [
        { ...initialTaskStates.task, id: 1 },
        { ...initialTaskStates.task, id: 2 },
        { ...initialTaskStates.task, id: 3 },
      ],
      proxies: ['invalid'],
      settings: {
        proxies: ['proxyPlaceholder1', 'proxyPlaceholder2', 'proxyPlaceholder3'],
      },
      extra: 'field',
    };
    const expected = {
      newTask: {
        ...initialTaskStates.task,
      },
      tasks: [
        { ...initialTaskStates.task, id: 1 },
        { ...initialTaskStates.task, id: 2 },
        { ...initialTaskStates.task, id: 3 },
      ],
      proxies: ['proxyPlaceholder1', 'proxyPlaceholder2', 'proxyPlaceholder3'],
    };
    expect(mapStateToProps(state)).toEqual(expected);
  });

  test('map dispatch to props returns correct structure', () => {
    const dispatch = jest.fn();
    const actual = mapDispatchToProps(dispatch);
    // Call the handlers with generic objects because we don't
    // Have a way of verifying the args inside the thunk
    // TODO: figure out a way to explicitly test args
    actual.onDestroyTask({});
    actual.onStartTask({}, []);
    actual.onStopTask({});
    // Since these actions generate a thunk, we can't test for
    // exact equality, only that a function (i.e. thunk) was
    // dispatched.
    expect(dispatch).toHaveBeenCalledTimes(3);
    expect(dispatch).toHaveBeenNthCalledWith(1, expect.any(Function));
    expect(dispatch).toHaveBeenNthCalledWith(2, expect.any(Function));
    expect(dispatch).toHaveBeenNthCalledWith(3, expect.any(Function));
  });
});
