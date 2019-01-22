/* global describe it expect beforeEach jest test */
import React from 'react';
import { shallow } from 'enzyme';

import LogTaskRow from '../../tasks/logTaskRow';

describe('<LogTaskRow />', () => {
  it('should render with required props', () => {
    const task = {
      id: 'testTask',
      index: 1,
      site: { name: 'Test' },
      output: { message: 'Test Message' },
    };
    const wrapper = shallow(<LogTaskRow task={task} />);
    expect(wrapper.find('.tasks-row-container')).toHaveLength(1);
    const id = wrapper.find('.tasks-row__log--id');
    const site = wrapper.find('.tasks-row__log--site');
    const output = wrapper.find('.tasks-row__log--output');

    expect(id).toHaveLength(1);
    expect(id.text()).toBe('01');
    expect(site).toHaveLength(1);
    expect(site.text()).toBe('Test');
    expect(output).toHaveLength(1);
    expect(output.text()).toBe('Test Message');
  });

  it('should render properly when id is >= 10', () => {
    const task = {
      id: 'testTask',
      index: 11,
      site: { name: 'Test' },
      output: { message: 'Test Message' },
    };
    const wrapper = shallow(<LogTaskRow task={task} />);
    expect(wrapper.find('.tasks-row-container')).toHaveLength(1);
    const id = wrapper.find('.tasks-row__log--id');
    const site = wrapper.find('.tasks-row__log--site');
    const output = wrapper.find('.tasks-row__log--output');

    expect(id).toHaveLength(1);
    expect(id.text()).toBe('11');
    expect(site).toHaveLength(1);
    expect(site.text()).toBe('Test');
    expect(output).toHaveLength(1);
    expect(output.text()).toBe('Test Message');
  });
});
