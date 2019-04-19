/* global describe it expect beforeEach jest test */
import React from 'react';
import { shallow } from 'enzyme';

import { LogTaskPrimitive, mapStateToProps } from '../../tasks/logTask';
import LogTaskRow from '../../tasks/logTaskRow';

describe('<LogTask />', () => {
  it('should render', () => {
    const wrapper = shallow(<LogTaskPrimitive tasks={[]} />);
    expect(wrapper.find('.tasks-log')).toHaveLength(1);
  });

  it('should render full screen', () => {
    const wrapper = shallow(<LogTaskPrimitive tasks={[]} />);
    expect(wrapper.find('.tasks-log')).toHaveLength(1);
  });

  it('should render with the correct number of rows', () => {
    const tasks = [
      { status: 'running' },
      { status: 'idle' },
      { status: 'running' },
      { status: 'idle' },
    ];
    const wrapper = shallow(<LogTaskPrimitive tasks={tasks} />);
    expect(wrapper.find(LogTaskRow)).toHaveLength(2);
  });

  test('map state to props should return correct structure', () => {
    const state = {
      tasks: ['testing', 'testing2'],
      not: 'a key',
    };
    const expected = {
      tasks: state.tasks,
    };
    expect(mapStateToProps(state)).toEqual(expected);
  });
});
