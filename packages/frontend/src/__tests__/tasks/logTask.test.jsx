import React from 'react';
import { shallow, mount } from 'enzyme';

import { LogTaskPrimitive, mapStateToProps } from '../../tasks/logTask';
import LogTaskRow from '../../tasks/logTaskRow';
import initialTasksStates from '../../state/initial/tasks';

describe('<LogTask />', () => {
  let defaultProps;

  const getWrapper = (method, customProps) => {
    const renderProps = {
      ...defaultProps,
      ...customProps,
    };
    return method(<LogTaskPrimitive tasks={renderProps.tasks} />);
  };

  const renderShallowWithProps = customProps => getWrapper(shallow, customProps);

  const renderMountWithProps = customProps => getWrapper(mount, customProps);

  beforeEach(() => {
    defaultProps = {
      tasks: initialTasksStates.list,
    };
  });

  it('should toggle between non-expanded and expanded', () => {
    const wrapper = renderShallowWithProps();
    let container;
    let sectionHeader;
    let id;
    let store;
    let product;
    let size;
    let proxy;
    let output;

    container = wrapper.find('.tasks-log-container');
    sectionHeader = wrapper.find('.tasks-log__section-header');
    id = wrapper.find('.tasks-log__header--id');
    store = wrapper.find('.tasks-log__header--store');
    product = wrapper.find('.tasks-log__header--product');
    size = wrapper.find('.tasks-log__header--size');
    proxy = wrapper.find('.tasks-log__header--proxy');
    output = wrapper.find('.tasks-log__header--output');

    expect(container).toHaveLength(1);
    expect(sectionHeader).toHaveLength(1);
    expect(id).toHaveLength(1);
    expect(store).toHaveLength(1);
    expect(product).toHaveLength(1);
    expect(size).toHaveLength(1);
    expect(proxy).toHaveLength(1);
    expect(output).toHaveLength(1);

    expect(wrapper.state('fullscreen')).toBeFalsy();
    expect(wrapper.state('selected')).toEqual([]);
    expect(wrapper.state('focused')).toEqual('');

    const header = wrapper.find('.tasks-log__header').first();
    header.simulate('doubleClick');

    container = wrapper.find('.tasks-log-container--fullscreen');
    sectionHeader = wrapper.find('.tasks-log__section-header--fullscreen');
    id = wrapper.find('.tasks-log__header--id');
    store = wrapper.find('.tasks-log__header--store');
    product = wrapper.find('.tasks-log__header--product--fullscreen');
    size = wrapper.find('.tasks-log__header--size');
    proxy = wrapper.find('.tasks-log__header--proxy--fullscreen');
    output = wrapper.find('.tasks-log__header--output--fullscreen');

    expect(container).toHaveLength(1);
    expect(sectionHeader).toHaveLength(1);
    expect(id).toHaveLength(1);
    expect(store).toHaveLength(1);
    expect(product).toHaveLength(1);
    expect(size).toHaveLength(1);
    expect(proxy).toHaveLength(1);
    expect(output).toHaveLength(1);

    expect(wrapper.state('fullscreen')).toBeTruthy();
    expect(wrapper.state('selected')).toEqual([]);
    expect(wrapper.state('focused')).toEqual('');

    header.simulate('doubleClick');

    container = wrapper.find('.tasks-log-container');
    sectionHeader = wrapper.find('.tasks-log__section-header');
    id = wrapper.find('.tasks-log__header--id');
    store = wrapper.find('.tasks-log__header--store');
    product = wrapper.find('.tasks-log__header--product');
    size = wrapper.find('.tasks-log__header--size');
    proxy = wrapper.find('.tasks-log__header--proxy');
    output = wrapper.find('.tasks-log__header--output');

    expect(container).toHaveLength(1);
    expect(sectionHeader).toHaveLength(1);
    expect(id).toHaveLength(1);
    expect(store).toHaveLength(1);
    expect(product).toHaveLength(1);
    expect(size).toHaveLength(1);
    expect(proxy).toHaveLength(1);
    expect(output).toHaveLength(1);

    expect(wrapper.state('fullscreen')).toBeTruthy();
    expect(wrapper.state('selected')).toEqual([]);
    expect(wrapper.state('focused')).toEqual('');
  });

  describe('non-expanded', () => {
    it('should render with required props', () => {
      const wrapper = renderShallowWithProps();
      const container = wrapper.find('.tasks-log-container');
      const sectionHeader = wrapper.find('.tasks-log__section-header');
      const id = wrapper.find('.tasks-log__header--id');
      const store = wrapper.find('.tasks-log__header--store');
      const product = wrapper.find('.tasks-log__header--product');
      const size = wrapper.find('.tasks-log__header--size');
      const proxy = wrapper.find('.tasks-log__header--proxy');
      const output = wrapper.find('.tasks-log__header--output');

      expect(container).toHaveLength(1);
      expect(sectionHeader).toHaveLength(1);
      expect(id).toHaveLength(1);
      expect(store).toHaveLength(1);
      expect(product).toHaveLength(1);
      expect(size).toHaveLength(1);
      expect(proxy).toHaveLength(1);
      expect(output).toHaveLength(1);

      expect(wrapper.state('fullscreen')).toBeFalsy();
      expect(wrapper.state('selected')).toEqual([]);
      expect(wrapper.state('focused')).toEqual('');
    });

    it('should not allow selecting rows', () => {
      const customProps = {
        tasks: [
          {
            ...initialTasksStates.task,
            id: 1,
            status: 'running',
          },
        ],
      };
      const wrapper = renderShallowWithProps(customProps);
      const row = wrapper.find(LogTaskRow);
      expect(row).toHaveLength(1);
      row.simulate('click');
      expect(wrapper.state('focused')).toEqual('');
      expect(wrapper.state('selected')).toEqual([]);
    });
  });

  describe('expanded', () => {
    it('should render with required props', () => {
      const wrapper = renderShallowWithProps();
      wrapper.setState({ fullscreen: true });
      const container = wrapper.find('.tasks-log-container--fullscreen');
      const sectionHeader = wrapper.find('.tasks-log__section-header--fullscreen');
      const id = wrapper.find('.tasks-log__header--id');
      const store = wrapper.find('.tasks-log__header--store');
      const product = wrapper.find('.tasks-log__header--product--fullscreen');
      const size = wrapper.find('.tasks-log__header--size');
      const proxy = wrapper.find('.tasks-log__header--proxy--fullscreen');
      const output = wrapper.find('.tasks-log__header--output--fullscreen');

      expect(container).toHaveLength(1);
      expect(sectionHeader).toHaveLength(1);
      expect(id).toHaveLength(1);
      expect(store).toHaveLength(1);
      expect(product).toHaveLength(1);
      expect(size).toHaveLength(1);
      expect(proxy).toHaveLength(1);
      expect(output).toHaveLength(1);

      expect(wrapper.state('fullscreen')).toBeTruthy();
      expect(wrapper.state('selected')).toEqual([]);
      expect(wrapper.state('focused')).toEqual('');
    });

    describe('should create table', () => {
      test('when there are no running/finished tasks', () => {
        const customProps = {
          tasks: [
            {
              ...initialTasksStates.task,
              id: 1,
              status: 'idle',
            },
          ],
        };
        const wrapper = renderShallowWithProps(customProps);
        wrapper.setState({ fullscreen: true });
        expect(wrapper.state('selected')).toEqual([]);
        expect(wrapper.state('focused')).toEqual('');
      });

      test('when there are running/finished tasks', () => {
        const customProps = {
          tasks: [
            {
              ...initialTasksStates.task,
              id: 1,
              status: 'running',
              log: ['first', 'second'],
            },
          ],
        };
        const wrapper = renderShallowWithProps(customProps);
        wrapper.setState({ fullscreen: true });
        const row = wrapper.find(LogTaskRow);
        expect(row).toHaveLength(1);
        row.simulate('click');
        expect(wrapper.state('focused')).toEqual(1);
        expect(wrapper.state('selected')).toEqual([1]);
        expect(wrapper.find('.tasks-live-log__output-row')).toHaveLength(2);
      });

      test('when there are no running/finished tasks but selected/focused is malformed', () => {
        const customProps = {
          tasks: [
            {
              ...initialTasksStates.task,
              id: 1,
              status: 'idle',
            },
          ],
        };
        const wrapper = renderShallowWithProps(customProps);
        wrapper.setState({ fullscreen: false, focused: 1 });
        expect(wrapper.state('focused')).toEqual(1);
        expect(wrapper.state('selected')).toEqual([]);
      });
    });

    test('when row is selected, but task is not found', () => {
      const customProps = {
        tasks: [
          {
            ...initialTasksStates.task,
            id: 1,
            status: 'running',
          },
        ],
      };
      const wrapper = renderShallowWithProps(customProps);
      wrapper.setState({ fullscreen: true });
      const row = wrapper.find(LogTaskRow);
      expect(row).toHaveLength(1);
      row.simulate('click');
      wrapper.setState({ focused: 2 });
      expect(wrapper.state('focused')).toEqual(2);
    });
  });

  it('map state to props should return correct structure', () => {
    const state = {
      tasks: [
        {
          ...initialTasksStates.task,
          id: 1,
        },
      ],
    };
    const actual = mapStateToProps(state);
    expect(actual).toEqual(state);
  });
});
