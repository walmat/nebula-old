/* global describe it expect beforeEach beforeAll jest test */
import React from 'react';
import { shallow } from 'enzyme';

import { ServerRowPrimitive, mapStateToProps, mapDispatchToProps } from '../../server/serverRow';
import { initialServerStates } from '../../utils/definitions/serverDefinitions';
import getByTestId from '../../__testUtils__/getByTestId';

describe('<ServerRow />', () => {
  let defaultProps;

  const renderShallowWithProps = (customProps) => {
    const renderProps = {
      ...defaultProps,
      ...customProps,
    };
    return shallow(<ServerRowPrimitive
      server={renderProps.server}
      serverInfo={renderProps.serverInfo}
      onConnectServer={renderProps.onConnectServer}
      onStartServer={renderProps.onStartServer}
      onStopServer={renderProps.onStopServer}
      onDestroyServer={renderProps.onDestroyServer}
      onKeyPress={renderProps.onKeyPress}
    />);
  };

  beforeEach(() => {
    defaultProps = {
      server: { ...initialServerStates.server },
      serverInfo: { ...initialServerStates.serverInfo },
      onConnectServer: () => {},
      onStartServer: () => {},
      onStopServer: () => {},
      onDestroyServer: () => {},
    };
  });

  it('should render with default props', () => {
    const wrapper = renderShallowWithProps();
    expect(wrapper.find('.server-row-container')).toHaveLength(1);
    expect(wrapper.find('.server-row')).toHaveLength(1);
    expect(wrapper.find('.server-row__type')).toHaveLength(1);
    expect(wrapper.find('.server-row__size')).toHaveLength(1);
    expect(wrapper.find('.server-row__location')).toHaveLength(1);
    expect(wrapper.find('.server-row__charges')).toHaveLength(1);
    expect(wrapper.find('.server-row__status')).toHaveLength(1);
    expect(wrapper.find('.server-row__actions')).toHaveLength(1);
    expect(getByTestId(wrapper, 'ServerRow.tableRowButton.action.connect')).toHaveLength(1);
    expect(getByTestId(wrapper, 'ServerRow.tableRowButton.action.start')).toHaveLength(1);
    expect(getByTestId(wrapper, 'ServerRow.tableRowButton.action.stop')).toHaveLength(1);
    expect(getByTestId(wrapper, 'ServerRow.tableRowButton.action.destroy')).toHaveLength(1);
    getByTestId(wrapper, 'ServerRow.tableRowButton.action.start').simulate('keyPress');
  });

  describe('when using non-default props', () => {
    let wrapper;
    let customProps;

    beforeAll(() => {
      customProps = {
        server: {
          type: { id: 1, value: 't1', label: 'type 1' },
          size: { id: 1, value: 's1', label: 'size 1' },
          location: { id: 1, value: 'l1', label: 'loc 1' },
          charges: 'some charges',
          status: 'testing',
          action: '',
        },
      };
      wrapper = renderShallowWithProps(customProps);
    });

    test('type displays value', () => {
      expect(wrapper.find('.server-row__type').text()).toBe('type 1');
    });

    test('size displays value', () => {
      expect(wrapper.find('.server-row__size').text()).toBe('size 1');
    });

    test('location displays value', () => {
      expect(wrapper.find('.server-row__location').text()).toBe('loc 1');
    });

    test('charges displays value', () => {
      expect(wrapper.find('.server-row__charges').text()).toBe('some charges');
    });

    test('status displays value', () => {
      expect(wrapper.find('.server-row__status').text()).toBe('testing');
    });
  });

  const testActionButton = (tag, title, stoppedClass, runningClass, eventHandler) => {
    test('renders correctly when server is stopped', () => {
      const customProps = {
        server: {
          ...initialServerStates.server,
          status: 'stopped',
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      const button = getByTestId(wrapper, `ServerRow.tableRowButton.action.${tag}`);
      expect(button.prop('role')).toBe('button');
      expect(button.prop('title')).toBe(title);
      expect(button.childAt(0).prop('className')).toBe(stoppedClass);
      expect(button.prop('onClick')).toBeDefined();
      expect(button.prop('onKeyPress')).toBeDefined();
    });

    test('renders correctly when server is running', () => {
      const customProps = {
        server: {
          ...initialServerStates.server,
          status: 'running',
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      const button = getByTestId(wrapper, `ServerRow.tableRowButton.action.${tag}`);
      expect(button.prop('role')).toBe('button');
      expect(button.prop('title')).toBe(title);
      expect(button.childAt(0).prop('className')).toBe(runningClass);
      expect(button.prop('onClick')).toBeDefined();
      expect(button.prop('onKeyPress')).toBeDefined();
    });

    test('handles on click event', () => {
      const customProps = {
        server: {
          ...initialServerStates.server,
          status: 'running',
        },
        serverInfo: {
          ...initialServerStates.serverInfo,
          credentials: {
            ...initialServerStates.awsCredentials,
            accessToken: 'test',
          },
        },
        onKeyPress: jest.fn(),
        [eventHandler]: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const button = getByTestId(wrapper, `ServerRow.tableRowButton.action.${tag}`);
      button.simulate('keyPress');
      expect(customProps.onKeyPress).toHaveBeenCalled();
      button.simulate('click');
      expect(customProps[eventHandler]).toHaveBeenCalledWith(
        customProps.server,
        customProps.serverInfo.credentials,
      );
    });
  };

  describe('connect button', () => {
    testActionButton('connect', 'Connect Server', '', '', 'onConnectServer');
  });

  describe('start button', () => {
    testActionButton('start', 'Start Server', '', 'active', 'onStartServer');
  });

  describe('stop button', () => {
    testActionButton('stop', 'Stop Server', 'active', '', 'onStopServer');
  });

  describe('destroy button', () => {
    testActionButton('destroy', 'Destroy Server', '', '', 'onDestroyServer');
  });

  test('map state to props returns correct structure', () => {
    const state = {
      server: 'invalid!',
      serverInfo: {
        test: 'server info',
      },
      extra: 'field',
    };
    const ownProps = {
      server: 'given server...',
      extra: 'field',
    };
    const expected = {
      server: 'given server...',
      serverInfo: {
        test: 'server info',
      },
    };
    expect(mapStateToProps(state, ownProps)).toEqual(expected);
  });

  test('map dispatch to props returns correct structure', () => {
    const dispatch = jest.fn();
    const actual = mapDispatchToProps(dispatch);
    // Call the handlers with generic objects because we don't
    // Have a way of verifying the args inside the thunk
    // TODO: figure out a way to explicitly test args
    actual.onConnectServer({}, {});
    actual.onStartServer({}, {});
    actual.onStopServer({}, {});
    actual.onDestroyServer({}, {});
    expect(dispatch).toHaveBeenCalledTimes(4);
    // Since these actions generate a thunk, we can't test for
    // exact equality, only that a function (i.e. thunk) was
    // dispatched.
    expect(dispatch).toHaveBeenNthCalledWith(1, expect.any(Function));
    expect(dispatch).toHaveBeenNthCalledWith(2, expect.any(Function));
    expect(dispatch).toHaveBeenNthCalledWith(3, expect.any(Function));
    expect(dispatch).toHaveBeenNthCalledWith(4, expect.any(Function));
  });
});
