/* global describe it expect beforeEach jest test */
import React from 'react';
import { shallow } from 'enzyme';

import { CreateProxiesPrimitive, mapStateToProps, mapDispatchToProps } from '../../server/createProxies';
import { SERVER_FIELDS, serverActions } from '../../state/actions';
import { initialServerStates } from '../../utils/definitions/serverDefinitions';
import getByTestId from '../../__testUtils__/getByTestId';

describe('<CreateProxies />', () => {
  let defaultProps;

  const renderShallowWithProps = (customProps) => {
    const renderProps = {
      ...defaultProps,
      ...customProps,
    };
    return shallow(<CreateProxiesPrimitive
      serverInfo={renderProps.serverInfo}
      serverListOptions={renderProps.serverListOptions}
      onEditServerInfo={renderProps.onEditServerInfo}
      onGenerateProxies={renderProps.onGenerateProxies}
      onDestroyProxies={renderProps.onDestroyProxies}
      onKeyPress={renderProps.onKeyPress}
    />);
  };

  beforeEach(() => {
    defaultProps = {
      serverInfo: { ...initialServerStates.serverInfo },
      serverListOptions: { ...initialServerStates.serverListOptions },
      onEditServerInfo: () => {},
      onGenerateProxies: () => {},
      onDestroyProxies: () => {},
    };
  });

  it('should render with required props', () => {
    const wrapper = renderShallowWithProps();
    const numProxiesInput = getByTestId(wrapper, 'CreateProxies.numProxiesInput');
    const locationSelect = getByTestId(wrapper, 'CreateProxies.location');
    const usernameInput = getByTestId(wrapper, 'CreateProxies.usernameInput');
    const passwordInput = getByTestId(wrapper, 'CreateProxies.passwordInput');
    const destroyButton = getByTestId(wrapper, 'CreateProxies.destroyProxiesButton');
    const generateButton = getByTestId(wrapper, 'CreateProxies.generateProxiesButton');
    expect(numProxiesInput).toHaveLength(1);
    expect(numProxiesInput.prop('value')).toBe(0);
    expect(locationSelect).toHaveLength(1);
    expect(locationSelect.prop('value')).toBe(null);
    expect(usernameInput).toHaveLength(1);
    expect(usernameInput.prop('value')).toBe('');
    expect(passwordInput).toHaveLength(1);
    expect(passwordInput.prop('value')).toBe('');
    expect(destroyButton).toHaveLength(1);
    expect(destroyButton.prop('title')).toBe('Login Required');
    expect(destroyButton.prop('disabled')).toBeTruthy();
    expect(destroyButton.prop('style')).toEqual({ cursor: 'not-allowed' });
    destroyButton.simulate('keyPress');
    expect(generateButton).toHaveLength(1);
    expect(generateButton.prop('title')).toBe('Login Required');
    expect(generateButton.prop('disabled')).toBeTruthy();
    expect(generateButton.prop('style')).toEqual({ cursor: 'not-allowed' });
    generateButton.simulate('keyPress');
  });

  it('should render with non-default props', () => {
    const customProps = {
      serverInfo: {
        ...initialServerStates.serverInfo,
        proxyOptions: {
          ...initialServerStates.proxyOptions,
          numProxies: 10,
          location: {
            id: 1,
            value: 'us-east-2',
            label: 'US East (Ohio)',
          },
          username: 'testUsername',
          password: 'testPassword',
        },
        credentials: {
          ...initialServerStates.awsCredentials,
          accessToken: 'ihaveaccess',
        },
      },
      onKeyPress: jest.fn(),
    };
    const wrapper = renderShallowWithProps(customProps);
    const numProxiesInput = getByTestId(wrapper, 'CreateProxies.numProxiesInput');
    const locationSelect = getByTestId(wrapper, 'CreateProxies.location');
    const usernameInput = getByTestId(wrapper, 'CreateProxies.usernameInput');
    const passwordInput = getByTestId(wrapper, 'CreateProxies.passwordInput');
    const destroyButton = getByTestId(wrapper, 'CreateProxies.destroyProxiesButton');
    const generateButton = getByTestId(wrapper, 'CreateProxies.generateProxiesButton');
    expect(numProxiesInput).toHaveLength(1);
    expect(numProxiesInput.prop('value')).toBe(10);
    expect(locationSelect).toHaveLength(1);
    expect(locationSelect.prop('value')).toEqual({ id: 1, label: 'US East (Ohio)', value: 'us-east-2' });
    expect(usernameInput).toHaveLength(1);
    expect(usernameInput.prop('value')).toBe('testUsername');
    expect(passwordInput).toHaveLength(1);
    expect(passwordInput.prop('value')).toBe('testPassword');
    expect(destroyButton).toHaveLength(1);
    expect(destroyButton.prop('title')).toBe('');
    expect(destroyButton.prop('disabled')).toBeFalsy();
    expect(destroyButton.prop('style')).toEqual({ cursor: 'pointer' });
    destroyButton.simulate('keyPress');
    expect(generateButton).toHaveLength(1);
    expect(generateButton.prop('title')).toBe('');
    expect(generateButton.prop('disabled')).toBeFalsy();
    expect(generateButton.prop('style')).toEqual({ cursor: 'pointer' });
    generateButton.simulate('keyPress');
    expect(customProps.onKeyPress).toHaveBeenCalledTimes(2);
  });

  describe('should handle editing', () => {
    test('number of proxies', () => {
      const customProps = {
        onEditServerInfo: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const numProxiesInput = getByTestId(wrapper, 'CreateProxies.numProxiesInput');
      numProxiesInput.simulate('change', { target: { value: 14 } });
      expect(customProps.onEditServerInfo).toHaveBeenCalledTimes(1);
      expect(customProps.onEditServerInfo).toHaveBeenCalledWith(
        SERVER_FIELDS.EDIT_PROXY_NUMBER,
        14,
      );
    });

    test('location of proxies', () => {
      const customProps = {
        onEditServerInfo: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const locationSelect = getByTestId(wrapper, 'CreateProxies.location');
      locationSelect.simulate('change', { id: 1, label: 'US East (Ohio)', value: 'us-east-2' });
      expect(customProps.onEditServerInfo).toHaveBeenCalledTimes(1);
      expect(customProps.onEditServerInfo).toHaveBeenCalledWith(
        SERVER_FIELDS.EDIT_PROXY_LOCATION,
        { id: 1, label: 'US East (Ohio)', value: 'us-east-2' },
      );
    });

    test('proxy username', () => {
      const customProps = {
        onEditServerInfo: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const usernameInput = getByTestId(wrapper, 'CreateProxies.usernameInput');
      usernameInput.simulate('change', { target: { value: 'newusername' } });
      expect(customProps.onEditServerInfo).toHaveBeenCalledTimes(1);
      expect(customProps.onEditServerInfo).toHaveBeenCalledWith(
        SERVER_FIELDS.EDIT_PROXY_USERNAME,
        'newusername',
      );
    });

    test('proxy password', () => {
      const customProps = {
        onEditServerInfo: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const passwordInput = getByTestId(wrapper, 'CreateProxies.passwordInput');
      passwordInput.simulate('change', { target: { value: 'newpassword' } });
      expect(customProps.onEditServerInfo).toHaveBeenCalledTimes(1);
      expect(customProps.onEditServerInfo).toHaveBeenCalledWith(
        SERVER_FIELDS.EDIT_PROXY_PASSWORD,
        'newpassword',
      );
    });
  });

  describe('destroy button', () => {
    test('should render correctly when not logged into aws', () => {
      const wrapper = renderShallowWithProps();
      const destroyButton = getByTestId(wrapper, 'CreateProxies.destroyProxiesButton');
      expect(destroyButton.prop('title')).toBe('Login Required');
      expect(destroyButton.prop('disabled')).toBeTruthy();
      expect(destroyButton.prop('style')).toEqual({ cursor: 'not-allowed' });
      expect(destroyButton.text()).toBe('Destroy All');
    });

    test('should render correctly when logged into aws', () => {
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
      const destroyButton = getByTestId(wrapper, 'CreateProxies.destroyProxiesButton');
      expect(destroyButton.prop('title')).toBe('');
      expect(destroyButton.prop('disabled')).toBeFalsy();
      expect(destroyButton.prop('style')).toEqual({ cursor: 'pointer' });
      expect(destroyButton.text()).toBe('Destroy All');
    });

    test('should call destroy handler when clicked and logged into aws', () => {
      const customProps = {
        serverInfo: {
          ...initialServerStates.serverInfo,
          credentials: {
            ...initialServerStates.awsCredentials,
            accessToken: 'test',
          },
        },
        onDestroyProxies: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const destroyButton = getByTestId(wrapper, 'CreateProxies.destroyProxiesButton');
      destroyButton.simulate('click');
      expect(customProps.onDestroyProxies).toHaveBeenCalled();
    });

    test('should not call destroy handler when click and not logged into aws', () => {
      const customProps = {
        onDestroyProxies: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const destroyButton = getByTestId(wrapper, 'CreateProxies.destroyProxiesButton');
      destroyButton.simulate('click');
      expect(customProps.onDestroyProxies).not.toHaveBeenCalled();
    });
  });

  describe('generate button', () => {
    test('should render correctly when not logged into aws', () => {
      const wrapper = renderShallowWithProps();
      const generateButton = getByTestId(wrapper, 'CreateProxies.generateProxiesButton');
      expect(generateButton.prop('title')).toBe('Login Required');
      expect(generateButton.prop('disabled')).toBeTruthy();
      expect(generateButton.prop('style')).toEqual({ cursor: 'not-allowed' });
      expect(generateButton.text()).toBe('Generate');
    });

    test('should render correctly when logged into aws', () => {
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
      const generateButton = getByTestId(wrapper, 'CreateProxies.generateProxiesButton');
      expect(generateButton.prop('title')).toBe('');
      expect(generateButton.prop('disabled')).toBeFalsy();
      expect(generateButton.prop('style')).toEqual({ cursor: 'pointer' });
      expect(generateButton.text()).toBe('Generate');
    });

    test('should call generate handler when clicked and logged into aws', () => {
      const customProps = {
        serverInfo: {
          ...initialServerStates.serverInfo,
          credentials: {
            ...initialServerStates.awsCredentials,
            accessToken: 'test',
          },
        },
        onGenerateProxies: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const generateButton = getByTestId(wrapper, 'CreateProxies.generateProxiesButton');
      generateButton.simulate('click');
      expect(customProps.onGenerateProxies).toHaveBeenCalled();
    });

    test('should not call generate handler when click and not logged into aws', () => {
      const customProps = {
        onGenerateProxies: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const generateButton = getByTestId(wrapper, 'CreateProxies.generateProxiesButton');
      generateButton.simulate('click');
      expect(customProps.onGenerateProxies).not.toHaveBeenCalled();
    });
  });

  test('map state to props should return the correct structure', () => {
    const state = {
      serverInfo: { server: 'info' },
      extra: 'field',
    };
    const expected = {
      serverInfo: { server: 'info' },
    };
    const actual = mapStateToProps(state);
    expect(actual).toEqual(expected);
  });

  test('map dispatch to props should return the correct structure', () => {
    const dispatch = jest.fn();
    const actual = mapDispatchToProps(dispatch);
    actual.onEditServerInfo('test_field', 'test_value');
    actual.onGenerateProxies('options');
    actual.onDestroyProxies();
    expect(dispatch).toHaveBeenCalledTimes(3);
    expect(dispatch).toHaveBeenNthCalledWith(1, serverActions.edit(null, 'test_field', 'test_value'));
    expect(dispatch).toHaveBeenNthCalledWith(2, expect.any(Function));
    expect(dispatch).toHaveBeenNthCalledWith(3, expect.any(Function));
  });
});
