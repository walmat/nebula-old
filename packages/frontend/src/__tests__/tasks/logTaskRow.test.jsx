/* global describe it expect beforeEach jest test */
import React from 'react';
import { shallow } from 'enzyme';
import getByTestId from '../../__testUtils__/getByTestId';
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
    const container = getByTestId(wrapper, 'LogTaskRow.container');
    const id = getByTestId(wrapper, 'LogTaskRow.id');
    const store = getByTestId(wrapper, 'LogTaskRow.store');
    const product = getByTestId(wrapper, 'LogTaskRow.product');
    const size = getByTestId(wrapper, 'LogTaskRow.size');
    const proxy = getByTestId(wrapper, 'LogTaskRow.proxy');
    const output = getByTestId(wrapper, 'LogTaskRow.output');

    expect(container).toHaveLength(1);
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
    const container = getByTestId(wrapper, 'LogTaskRow.container');
    const id = getByTestId(wrapper, 'LogTaskRow.id');
    const store = getByTestId(wrapper, 'LogTaskRow.store');
    const product = getByTestId(wrapper, 'LogTaskRow.product');
    const size = getByTestId(wrapper, 'LogTaskRow.size');
    const proxy = getByTestId(wrapper, 'LogTaskRow.proxy');
    const output = getByTestId(wrapper, 'LogTaskRow.output');
    expect(container).toHaveLength(1);
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
    const container = getByTestId(wrapper, 'LogTaskRow.container');
    const id = getByTestId(wrapper, 'LogTaskRow.id');
    const store = getByTestId(wrapper, 'LogTaskRow.store');
    const product = getByTestId(wrapper, 'LogTaskRow.product');
    const size = getByTestId(wrapper, 'LogTaskRow.size');
    const proxy = getByTestId(wrapper, 'LogTaskRow.proxy');
    const output = getByTestId(wrapper, 'LogTaskRow.output');
    expect(container).toHaveLength(1);
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
    const container = getByTestId(wrapper, 'LogTaskRow.container');
    const id = getByTestId(wrapper, 'LogTaskRow.id');
    const store = getByTestId(wrapper, 'LogTaskRow.store');
    const product = getByTestId(wrapper, 'LogTaskRow.product');
    const size = getByTestId(wrapper, 'LogTaskRow.size');
    const proxy = getByTestId(wrapper, 'LogTaskRow.proxy');
    const output = getByTestId(wrapper, 'LogTaskRow.output');
    expect(container).toHaveLength(1);
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
