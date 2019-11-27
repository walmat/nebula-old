/* global describe it expect beforeEach jest test */
import React from 'react';
import { shallow } from 'enzyme';

import { ViewTaskPrimitive, mapStateToProps } from '../../tasks/viewTask';
import TaskRow from '../../tasks/taskRow';
import initialTaskStates from '../../state/initial/tasks';

describe('<ViewTask />', () => {
  it('should render correctly with default props', () => {
    const wrapper = shallow(<ViewTaskPrimitive tasks={[]} />);
    expect(wrapper.find('.tasks-table')).toHaveLength(1);
    expect(wrapper.find(TaskRow)).toHaveLength(0);
  });

  it('should render correctly with one task', () => {
    const tasks = [
      {
        ...initialTaskStates.task,
        id: 1,
      },
    ];
    const wrapper = shallow(<ViewTaskPrimitive tasks={tasks} />);
    expect(wrapper.find('.tasks-table')).toHaveLength(1);
    expect(wrapper.find(TaskRow)).toHaveLength(1);
    expect(
      wrapper
        .find(TaskRow)
        .at(0)
        .prop('task'),
    ).toEqual(tasks[0]);
  });

  it('should render correctly with multiple tasks', () => {
    const tasks = [
      {
        ...initialTaskStates.task,
        id: 1,
      },
      {
        ...initialTaskStates.task,
        id: 2,
      },
      {
        ...initialTaskStates.task,
        id: 3,
      },
    ];
    const wrapper = shallow(<ViewTaskPrimitive tasks={tasks} />);
    expect(wrapper.find('.tasks-table')).toHaveLength(1);
    expect(wrapper.find(TaskRow)).toHaveLength(3);
    expect(
      wrapper
        .find(TaskRow)
        .at(0)
        .prop('task'),
    ).toEqual(tasks[0]);
    expect(
      wrapper
        .find(TaskRow)
        .at(1)
        .prop('task'),
    ).toEqual(tasks[1]);
    expect(
      wrapper
        .find(TaskRow)
        .at(2)
        .prop('task'),
    ).toEqual(tasks[2]);
  });

  test('map state to props should return correct structure', () => {
    const state = {
      tasks: ['taskplaceholder1', 'taskplaceholder2'],
      extra: 'field',
    };
    const expected = {
      tasks: ['taskplaceholder1', 'taskplaceholder2'],
    };
    expect(mapStateToProps(state)).toEqual(expected);
  });
});
