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
      sizes: ['Random'],
      proxy: null,
      product: { found: undefined, raw: '+Test' },
      output: 'Test Message',
    };
    const onClick = () => {};
    const wrapper = shallow(
      <LogTaskRow task={task} onClick={onClick} selected={false} fullscreen={false} />,
    );
    expect(wrapper.find('.tasks-row-container')).toHaveLength(1);
    const id = wrapper.find('.tasks-row__log--id');
    const store = wrapper.find('.tasks-row__log--store');
    const product = wrapper.find('.tasks-row__log--product');
    const size = wrapper.find('.tasks-row__log--size');
    const proxy = wrapper.find('.tasks-row__log--proxy');
    const output = wrapper.find('.tasks-row__log--output');
    expect(id).toHaveLength(1);
    expect(id.text()).toBe('01');
    expect(store).toHaveLength(1);
    expect(store.text()).toBe('Test');
    expect(product).toHaveLength(1);
    expect(product.text()).toBe('+Test');
    expect(size).toHaveLength(1);
    expect(size.text()).toBe('Random');
    expect(proxy).toHaveLength(1);
    expect(proxy.text()).toBe('None');
    expect(output).toHaveLength(1);
    expect(output.text()).toBe('Test Message');
  });

  it('should render with required props while fullscreen', () => {
    const task = {
      id: 'testTask',
      index: 1,
      site: { name: 'Test' },
      sizes: ['Random'],
      proxy: null,
      product: { found: undefined, raw: '+Test' },
      output: 'Test Message',
    };
    const onClick = () => {};
    const wrapper = shallow(
      <LogTaskRow task={task} onClick={onClick} selected={false} fullscreen />,
    );
    expect(wrapper.find('.tasks-row-container')).toHaveLength(1);
    const id = wrapper.find('.tasks-row__log--id--fullscreen');
    const store = wrapper.find('.tasks-row__log--store--fullscreen');
    const product = wrapper.find('.tasks-row__log--product--fullscreen');
    const size = wrapper.find('.tasks-row__log--size--fullscreen');
    const proxy = wrapper.find('.tasks-row__log--proxy--fullscreen');
    const output = wrapper.find('.tasks-row__log--output--fullscreen');
    expect(id).toHaveLength(1);
    expect(id.text()).toBe('01');
    expect(store).toHaveLength(1);
    expect(store.text()).toBe('Test');
    expect(product).toHaveLength(1);
    expect(product.text()).toBe('+Test');
    expect(size).toHaveLength(1);
    expect(size.text()).toBe('Random');
    expect(proxy).toHaveLength(1);
    expect(proxy.text()).toBe('None');
    expect(output).toHaveLength(1);
    expect(output.text()).toBe('Test Message');
  });

  it('should render with required props while selected', () => {
    const task = {
      id: 'testTask',
      index: 1,
      site: { name: 'Test' },
      sizes: ['Random'],
      proxy: null,
      product: { found: undefined, raw: '+Test' },
      output: 'Test Message',
    };
    const onClick = () => {};
    const wrapper = shallow(<LogTaskRow task={task} onClick={onClick} selected fullscreen />);
    expect(wrapper.find('.tasks-row-container')).toHaveLength(1);
    const id = wrapper.find('.tasks-row__log--id--fullscreen');
    const store = wrapper.find('.tasks-row__log--store--fullscreen');
    const product = wrapper.find('.tasks-row__log--product--fullscreen');
    const size = wrapper.find('.tasks-row__log--size--fullscreen');
    const proxy = wrapper.find('.tasks-row__log--proxy--fullscreen');
    const output = wrapper.find('.tasks-row__log--output--fullscreen');
    expect(id).toHaveLength(1);
    expect(id.text()).toBe('01');
    expect(store).toHaveLength(1);
    expect(store.text()).toBe('Test');
    expect(product).toHaveLength(1);
    expect(product.text()).toBe('+Test');
    expect(size).toHaveLength(1);
    expect(size.text()).toBe('Random');
    expect(proxy).toHaveLength(1);
    expect(proxy.text()).toBe('None');
    expect(output).toHaveLength(1);
    expect(output.text()).toBe('Test Message');
  });

  it('should render properly when id is >= 10', () => {
    const task = {
      id: 'testTask',
      index: 11,
      site: { name: 'Test' },
      sizes: ['Random'],
      proxy: null,
      product: { found: undefined, raw: '+Test' },
      output: 'Test Message',
    };
    const wrapper = shallow(<LogTaskRow task={task} />);
    expect(wrapper.find('.tasks-row-container')).toHaveLength(1);
    const id = wrapper.find('.tasks-row__log--id');
    const store = wrapper.find('.tasks-row__log--store');
    const product = wrapper.find('.tasks-row__log--product');
    const size = wrapper.find('.tasks-row__log--size');
    const proxy = wrapper.find('.tasks-row__log--proxy');
    const output = wrapper.find('.tasks-row__log--output');
    expect(id).toHaveLength(1);
    expect(id.text()).toBe('11');
    expect(store).toHaveLength(1);
    expect(store.text()).toBe('Test');
    expect(product).toHaveLength(1);
    expect(product.text()).toBe('+Test');
    expect(size).toHaveLength(1);
    expect(size.text()).toBe('Random');
    expect(proxy).toHaveLength(1);
    expect(proxy.text()).toBe('None');
    expect(output).toHaveLength(1);
    expect(output.text()).toBe('Test Message');
  });
});
