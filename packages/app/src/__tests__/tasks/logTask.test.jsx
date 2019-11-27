import React from 'react';
import { shallow } from 'enzyme';

import { LogTaskPrimitive, mapStateToProps } from '../../tasks/logTask';
import LogTaskRow from '../../tasks/logTaskRow';
import initialTasksStates from '../../state/initial/tasks';
import getByTestId from '../../__testUtils__/getByTestId';

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

  beforeEach(() => {
    defaultProps = {
      tasks: initialTasksStates.list,
    };
  });

  it('should toggle between non-expanded and expanded', () => {
    const wrapper = renderShallowWithProps();
    const container = getByTestId(wrapper, 'LogTaskPrimitive.container');
    const sectionHeader = getByTestId(wrapper, 'LogTaskPrimitive.sectionHeader');
    const id = getByTestId(wrapper, 'LogTaskPrimitive.header--id');
    const store = getByTestId(wrapper, 'LogTaskPrimitive.header--store');
    const product = getByTestId(wrapper, 'LogTaskPrimitive.header--product');
    const size = getByTestId(wrapper, 'LogTaskPrimitive.header--size');
    const proxy = getByTestId(wrapper, 'LogTaskPrimitive.header--proxy');
    const output = getByTestId(wrapper, 'LogTaskPrimitive.header--output');
    const header = getByTestId(wrapper, 'LogTaskPrimitive.tableHeader');

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

    header.prop('onDoubleClick')();

    expect(wrapper.state('fullscreen')).toBeTruthy();
    expect(wrapper.state('selected')).toEqual([]);
    expect(wrapper.state('focused')).toEqual('');
  });

  describe('non-expanded', () => {
    it('should render with required props', () => {
      const wrapper = renderShallowWithProps();
      const container = getByTestId(wrapper, 'LogTaskPrimitive.container');
      const sectionHeader = getByTestId(wrapper, 'LogTaskPrimitive.sectionHeader');
      const id = getByTestId(wrapper, 'LogTaskPrimitive.header--id');
      const store = getByTestId(wrapper, 'LogTaskPrimitive.header--store');
      const product = getByTestId(wrapper, 'LogTaskPrimitive.header--product');
      const size = getByTestId(wrapper, 'LogTaskPrimitive.header--size');
      const proxy = getByTestId(wrapper, 'LogTaskPrimitive.header--proxy');
      const output = getByTestId(wrapper, 'LogTaskPrimitive.header--output');

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
      const container = getByTestId(wrapper, 'LogTaskPrimitive.container');
      const sectionHeader = getByTestId(wrapper, 'LogTaskPrimitive.sectionHeader');
      const id = getByTestId(wrapper, 'LogTaskPrimitive.header--id');
      const store = getByTestId(wrapper, 'LogTaskPrimitive.header--store');
      const product = getByTestId(wrapper, 'LogTaskPrimitive.header--product');
      const size = getByTestId(wrapper, 'LogTaskPrimitive.header--size');
      const proxy = getByTestId(wrapper, 'LogTaskPrimitive.header--proxy');
      const output = getByTestId(wrapper, 'LogTaskPrimitive.header--output');

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
        const feed = getByTestId(wrapper, 'LogTaskPrimitive.feed');
        expect(wrapper.state('focused')).toEqual(1);
        expect(wrapper.state('selected')).toEqual([1]);
        expect(feed.children()).toHaveLength(2);
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
      extra: 'field',
      this: 'should not be included',
    };

    const expected = {
      tasks: [
        {
          ...initialTasksStates.task,
          id: 1,
        },
      ],
    };
    const actual = mapStateToProps(state);
    expect(actual).toEqual(expected);
  });
});
