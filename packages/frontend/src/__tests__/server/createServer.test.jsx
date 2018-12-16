/* global describe it expect beforeEach jest test */
import React from 'react';
import { shallow } from 'enzyme';

import {
  CreateServerPrimitive,
  mapStateToProps,
  mapDispatchToProps,
} from '../../server/createServer';
import { SERVER_FIELDS, serverActions } from '../../state/actions';
import { initialServerStates } from '../../utils/definitions/serverDefinitions';
import getByTestId from '../../__testUtils__/getByTestId';
import serverListOptions from '../../utils/servers';

describe('<CreateServer />', () => {
  let defaultProps;

  const renderShallowWithProps = customProps => {
    const renderProps = {
      ...defaultProps,
      ...customProps,
    };
    return shallow(
      <CreateServerPrimitive
        servers={renderProps.servers}
        serverType={renderProps.serverType}
        serverSize={renderProps.serverSize}
        serverLocation={renderProps.serverLocation}
        serverListOptions={renderProps.serverListOptions}
        serverInfo={renderProps.serverInfo}
        onEditServerInfo={renderProps.onEditServerInfo}
        onCreateServer={renderProps.onCreateServer}
        onDestroyServers={renderProps.onDestroyServers}
        onKeyPress={renderProps.onKeyPress}
      />,
    );
  };

  beforeEach(() => {
    defaultProps = {
      servers: [],
      serverInfo: { ...initialServerStates.serverInfo },
      serverListOptions,
      onEditServerInfo: () => {},
      onCreateServer: () => {},
      onDestroyServers: () => {},
    };
  });

  it('should render with required props', () => {
    const wrapper = renderShallowWithProps();
    expect(getByTestId(wrapper, 'CreateServer.serverOption.type')).toHaveLength(1);
    expect(getByTestId(wrapper, 'CreateServer.serverOption.size')).toHaveLength(1);
    expect(getByTestId(wrapper, 'CreateServer.serverOption.location')).toHaveLength(1);
    expect(getByTestId(wrapper, 'CreateServer.serversButton.destroy')).toHaveLength(1);
    expect(getByTestId(wrapper, 'CreateServer.serversButton.create')).toHaveLength(1);
    getByTestId(wrapper, 'CreateServer.serversButton.create').simulate('keyPress');
  });

  describe('server type component', () => {
    test('renders with default value', () => {
      const wrapper = renderShallowWithProps();
      const serverOptionType = getByTestId(wrapper, 'CreateServer.serverOption.type');
      const expectedOptions = serverListOptions.types.map(({ id, label }) => ({
        value: id,
        label,
      }));
      expect(serverOptionType.prop('options')).toEqual(expectedOptions);
      expect(serverOptionType.prop('value')).toBeNull();
      expect(serverOptionType.prop('onChange')).toBeDefined();
      expect(serverOptionType.prop('isDisabled')).toBeFalsy();
      expect(serverOptionType.prop('className')).toBe('server-options__input--select');
    });

    test('renders with selected value', () => {
      const customProps = {
        serverType: { value: 'test', label: 'testLabel' },
      };
      const wrapper = renderShallowWithProps(customProps);
      const serverOptionType = getByTestId(wrapper, 'CreateServer.serverOption.type');
      const expectedOptions = serverListOptions.types.map(({ id, label }) => ({
        value: id,
        label,
      }));
      expect(serverOptionType.prop('options')).toEqual(expectedOptions);
      expect(serverOptionType.prop('value')).toEqual(customProps.serverType);
      expect(serverOptionType.prop('onChange')).toBeDefined();
      expect(serverOptionType.prop('isDisabled')).toBeFalsy();
      expect(serverOptionType.prop('className')).toBe('server-options__input--select');
    });

    test('renders when no options are given', () => {
      const customProps = {
        serverListOptions: {},
      };
      const wrapper = renderShallowWithProps(customProps);
      const serverOptionType = getByTestId(wrapper, 'CreateServer.serverOption.type');
      expect(serverOptionType.prop('options')).not.toBeDefined();
      expect(serverOptionType.prop('value')).toBeNull();
      expect(serverOptionType.prop('onChange')).toBeDefined();
      expect(serverOptionType.prop('isDisabled')).toBeFalsy();
      expect(serverOptionType.prop('className')).toBe('server-options__input--select');
    });

    test("doesn't call on change handler when selected type isn't a valid option", () => {
      const customProps = {
        onEditServerInfo: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const serverOptionType = getByTestId(wrapper, 'CreateServer.serverOption.type');
      serverOptionType.simulate('change', { value: 'invalid', label: 'testLabel' });
      expect(customProps.onEditServerInfo).not.toHaveBeenCalled();
    });

    test('calls on change handler when selected type is valid', () => {
      const customProps = {
        onEditServerInfo: jest.fn(),
        serverListOptions: {
          ...serverListOptions,
          types: [{ id: 1, value: 'test', label: 'testLabel' }],
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      const serverOptionType = getByTestId(wrapper, 'CreateServer.serverOption.type');
      serverOptionType.simulate('change', { value: 1, label: 'testLabel' });
      expect(customProps.onEditServerInfo).toHaveBeenCalledWith(SERVER_FIELDS.EDIT_SERVER_TYPE, {
        id: 1,
        value: 'test',
        label: 'testLabel',
      });
    });
  });

  describe('server size component', () => {
    test('renders with default value', () => {
      const wrapper = renderShallowWithProps();
      const serverOptionSize = getByTestId(wrapper, 'CreateServer.serverOption.size');
      const expectedOptions = serverListOptions.sizes.map(({ id, label }) => ({
        value: id,
        label,
      }));
      expect(serverOptionSize.prop('options')).toEqual(expectedOptions);
      expect(serverOptionSize.prop('value')).toBeNull();
      expect(serverOptionSize.prop('onChange')).toBeDefined();
      expect(serverOptionSize.prop('isDisabled')).toBeTruthy();
      expect(serverOptionSize.prop('className')).toBe('server-options__input--select');
    });

    test('renders enabled when server type is selected', () => {
      const customProps = {
        serverType: { id: 1, value: 'test', label: 'testLabel' },
        serverListOptions: {
          ...serverListOptions,
          sizes: [
            {
              id: 1,
              value: 'test',
              label: 'testLabel',
              types: [1, 2, 3],
            },
            {
              id: 2,
              value: 'test',
              label: 'testLabel',
              types: [2, 3],
            },
          ],
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      const serverOptionSize = getByTestId(wrapper, 'CreateServer.serverOption.size');
      const expectedOptions = [{ value: 1, label: 'testLabel' }];
      expect(serverOptionSize.prop('options')).toEqual(expectedOptions);
      expect(serverOptionSize.prop('value')).toBeNull();
      expect(serverOptionSize.prop('onChange')).toBeDefined();
      expect(serverOptionSize.prop('isDisabled')).toBeFalsy();
      expect(serverOptionSize.prop('className')).toBe('server-options__input--select');
    });

    test('renders with selected value', () => {
      const customProps = {
        serverSize: { value: 'test', label: 'testLabel' },
      };
      const wrapper = renderShallowWithProps(customProps);
      const serverOptionSize = getByTestId(wrapper, 'CreateServer.serverOption.size');
      const expectedOptions = serverListOptions.sizes.map(({ id, label }) => ({
        value: id,
        label,
      }));
      expect(serverOptionSize.prop('options')).toEqual(expectedOptions);
      expect(serverOptionSize.prop('value')).toEqual(customProps.serverSize);
      expect(serverOptionSize.prop('onChange')).toBeDefined();
      expect(serverOptionSize.prop('isDisabled')).toBeTruthy();
      expect(serverOptionSize.prop('className')).toBe('server-options__input--select');
    });

    test('renders with selected value and enabled by server type', () => {
      const customProps = {
        serverType: { id: 1, value: 'test', label: 'testLabel' },
        serverSize: { id: 1, value: 'test', label: 'testLabel' },
        serverListOptions: {
          ...serverListOptions,
          sizes: [
            {
              id: 1,
              value: 'test',
              label: 'testLabel',
              types: [1, 2, 3],
            },
            {
              id: 2,
              value: 'test',
              label: 'testLabel',
              types: [2, 3],
            },
          ],
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      const serverOptionSize = getByTestId(wrapper, 'CreateServer.serverOption.size');
      const expectedOptions = [{ value: 1, label: 'testLabel' }];
      expect(serverOptionSize.prop('options')).toEqual(expectedOptions);
      expect(serverOptionSize.prop('value')).toEqual(customProps.serverSize);
      expect(serverOptionSize.prop('onChange')).toBeDefined();
      expect(serverOptionSize.prop('isDisabled')).toBeFalsy();
      expect(serverOptionSize.prop('className')).toBe('server-options__input--select');
    });

    test('renders when no options are given', () => {
      const customProps = {
        serverListOptions: {},
      };
      const wrapper = renderShallowWithProps(customProps);
      const serverOptionSize = getByTestId(wrapper, 'CreateServer.serverOption.size');
      expect(serverOptionSize.prop('options')).not.toBeDefined();
      expect(serverOptionSize.prop('value')).toBeNull();
      expect(serverOptionSize.prop('onChange')).toBeDefined();
      expect(serverOptionSize.prop('isDisabled')).toBeTruthy();
      expect(serverOptionSize.prop('className')).toBe('server-options__input--select');
    });

    test("doesn't call on change handler when selected size isn't a valid option", () => {
      const customProps = {
        onEditServerInfo: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const serverOptionSize = getByTestId(wrapper, 'CreateServer.serverOption.size');
      serverOptionSize.simulate('change', { value: 'invalid', label: 'testLabel' });
      expect(customProps.onEditServerInfo).not.toHaveBeenCalled();
    });

    test('calls on change handler when selected size is valid', () => {
      const customProps = {
        onEditServerInfo: jest.fn(),
        serverListOptions: {
          ...serverListOptions,
          sizes: [{ id: 1, value: 'test', label: 'testLabel' }],
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      const serverOptionSize = getByTestId(wrapper, 'CreateServer.serverOption.size');
      serverOptionSize.simulate('change', { value: 1, label: 'testLabel' });
      expect(customProps.onEditServerInfo).toHaveBeenCalledWith(SERVER_FIELDS.EDIT_SERVER_SIZE, {
        id: 1,
        value: 'test',
        label: 'testLabel',
      });
    });
  });

  describe('server location component', () => {
    test('renders with default value', () => {
      const wrapper = renderShallowWithProps();
      const serverOptionLocation = getByTestId(wrapper, 'CreateServer.serverOption.location');
      const expectedOptions = serverListOptions.locations.map(({ id, label }) => ({
        value: id,
        label,
      }));
      expect(serverOptionLocation.prop('options')).toEqual(expectedOptions);
      expect(serverOptionLocation.prop('value')).toBeNull();
      expect(serverOptionLocation.prop('onChange')).toBeDefined();
      expect(serverOptionLocation.prop('isDisabled')).toBeFalsy();
      expect(serverOptionLocation.prop('className')).toBe('server-options__input--select');
    });

    test('renders with selected value', () => {
      const customProps = {
        serverLocation: { value: 'test', label: 'testLabel' },
      };
      const wrapper = renderShallowWithProps(customProps);
      const serverOptionLocation = getByTestId(wrapper, 'CreateServer.serverOption.location');
      const expectedOptions = serverListOptions.locations.map(({ id, label }) => ({
        value: id,
        label,
      }));
      expect(serverOptionLocation.prop('options')).toEqual(expectedOptions);
      expect(serverOptionLocation.prop('value')).toEqual(customProps.serverLocation);
      expect(serverOptionLocation.prop('onChange')).toBeDefined();
      expect(serverOptionLocation.prop('isDisabled')).toBeFalsy();
      expect(serverOptionLocation.prop('className')).toBe('server-options__input--select');
    });

    test('renders when no options are given', () => {
      const customProps = {
        serverListOptions: {},
      };
      const wrapper = renderShallowWithProps(customProps);
      const serverOptionLocation = getByTestId(wrapper, 'CreateServer.serverOption.location');
      expect(serverOptionLocation.prop('options')).not.toBeDefined();
      expect(serverOptionLocation.prop('value')).toBeNull();
      expect(serverOptionLocation.prop('onChange')).toBeDefined();
      expect(serverOptionLocation.prop('isDisabled')).toBeFalsy();
      expect(serverOptionLocation.prop('className')).toBe('server-options__input--select');
    });

    test("doesn't call on change handler when selected location isn't a valid option", () => {
      const customProps = {
        onEditServerInfo: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const serverOptionLocation = getByTestId(wrapper, 'CreateServer.serverOption.location');
      serverOptionLocation.simulate('change', { value: 'invalid', label: 'testLabel' });
      expect(customProps.onEditServerInfo).not.toHaveBeenCalled();
    });

    test('calls on change handler when selected location is valid', () => {
      const customProps = {
        onEditServerInfo: jest.fn(),
        serverListOptions: {
          ...serverListOptions,
          locations: [{ id: 1, value: 'test', label: 'testLabel' }],
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      const serverOptionLocation = getByTestId(wrapper, 'CreateServer.serverOption.location');
      serverOptionLocation.simulate('change', { value: 1, label: 'testLabel' });
      expect(customProps.onEditServerInfo).toHaveBeenCalledWith(
        SERVER_FIELDS.EDIT_SERVER_LOCATION,
        { id: 1, value: 'test', label: 'testLabel' },
      );
    });
  });

  describe('create server button', () => {
    test('should render with default values (logged out of aws)', () => {
      const wrapper = renderShallowWithProps();
      const createServersButton = getByTestId(wrapper, 'CreateServer.serversButton.create');
      expect(createServersButton.prop('disabled')).toBeTruthy();
      expect(createServersButton.prop('onClick')).toBeDefined();
      expect(createServersButton.prop('title')).toBe('Login Required');
      expect(createServersButton.prop('style')).toEqual({ cursor: 'not-allowed' });
      expect(createServersButton.text()).toBe('Create');
    });

    test('should render when logged in to aws', () => {
      const customProps = {
        serverInfo: {
          ...initialServerStates.serverInfo,
          credentials: {
            ...initialServerStates.awsCredentials,
            accessToken: 'test',
          },
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      const createServersButton = getByTestId(wrapper, 'CreateServer.serversButton.create');
      expect(createServersButton.prop('disabled')).toBeFalsy();
      expect(createServersButton.prop('onClick')).toBeDefined();
      expect(createServersButton.prop('title')).toBe('');
      expect(createServersButton.prop('style')).toEqual({ cursor: 'pointer' });
      expect(createServersButton.text()).toBe('Create');
    });

    test('should handle create servers', () => {
      const customProps = {
        serverInfo: {
          ...initialServerStates.serverInfo,
          credentials: {
            accessToken: 'test',
          },
          serverOptions: { ...initialServerStates.serverOptions },
        },
        onCreateServer: jest.fn(),
        onKeyPress: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const createServersButton = getByTestId(wrapper, 'CreateServer.serversButton.create');
      createServersButton.simulate('keyPress');
      expect(customProps.onKeyPress).toHaveBeenCalled();
      createServersButton.simulate('click');
      expect(customProps.onCreateServer).toHaveBeenCalledWith(
        { ...initialServerStates.serverOptions },
        { accessToken: 'test' },
      );
    });
  });

  describe('destroy server button', () => {
    test('should render with default values (logged out of aws)', () => {
      const wrapper = renderShallowWithProps();
      const destroyServersButton = getByTestId(wrapper, 'CreateServer.serversButton.destroy');
      expect(destroyServersButton.prop('disabled')).toBeTruthy();
      expect(destroyServersButton.prop('onClick')).toBeDefined();
      expect(destroyServersButton.prop('title')).toBe('Login Required');
      expect(destroyServersButton.prop('style')).toEqual({ cursor: 'not-allowed' });
      expect(destroyServersButton.text()).toBe('Destroy All');
    });

    test('should render when logged in to aws', () => {
      const customProps = {
        serverInfo: {
          ...initialServerStates.serverInfo,
          credentials: {
            ...initialServerStates.awsCredentials,
            accessToken: 'test',
          },
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      const destroyServersButton = getByTestId(wrapper, 'CreateServer.serversButton.destroy');
      expect(destroyServersButton.prop('disabled')).toBeFalsy();
      expect(destroyServersButton.prop('onClick')).toBeDefined();
      expect(destroyServersButton.prop('title')).toBe('');
      expect(destroyServersButton.prop('style')).toEqual({ cursor: 'pointer' });
      expect(destroyServersButton.text()).toBe('Destroy All');
    });

    test('should handle destroy servers', () => {
      const customProps = {
        serverInfo: {
          ...initialServerStates.serverInfo,
          credentials: {
            accessToken: 'test',
          },
        },
        servers: [],
        onDestroyServers: jest.fn(),
        onKeyPress: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const destroyServersButton = getByTestId(wrapper, 'CreateServer.serversButton.destroy');
      destroyServersButton.simulate('keyPress');
      expect(customProps.onKeyPress).toHaveBeenCalled();
      destroyServersButton.simulate('click');
      expect(customProps.onDestroyServers).toHaveBeenCalledWith([], { accessToken: 'test' });
    });
  });

  describe('map state to props should return correct structure', () => {
    test('with default server option values', () => {
      const state = {
        servers: ['test'],
        serverInfo: {
          ...initialServerStates.serverInfo,
        },
        serverListOptions: ['test1'],
      };
      const expected = {
        servers: ['test'],
        serverInfo: state.serverInfo,
        serverType: null,
        serverSize: null,
        serverLocation: null,
        serverListOptions: ['test1'],
      };
      expect(mapStateToProps(state)).toEqual(expected);
    });

    test('with selected server option values', () => {
      const state = {
        servers: ['test'],
        serverInfo: {
          ...initialServerStates.serverInfo,
          serverOptions: {
            ...initialServerStates.serverOptions,
            type: 'testType',
            size: 'testSize',
            location: 'testLocation',
          },
        },
        serverListOptions: ['test1'],
      };
      const expected = {
        servers: ['test'],
        serverInfo: state.serverInfo,
        serverType: 'testType',
        serverSize: 'testSize',
        serverLocation: 'testLocation',
        serverListOptions: ['test1'],
      };
      expect(mapStateToProps(state)).toEqual(expected);
    });
  });

  test('map dispatch to props should return correct structure', () => {
    const dispatch = jest.fn();
    const actual = mapDispatchToProps(dispatch);
    actual.onEditServerInfo('test_field', 'test_value');
    actual.onCreateServer([], {});
    actual.onDestroyServers([], {});
    expect(dispatch).toHaveBeenCalledTimes(3);
    expect(dispatch).toHaveBeenNthCalledWith(
      1,
      serverActions.edit(null, 'test_field', 'test_value'),
    );
    expect(dispatch).toHaveBeenNthCalledWith(2, expect.any(Function));
    expect(dispatch).toHaveBeenNthCalledWith(3, expect.any(Function));
  });
});
