/* global describe it expect beforeEach jest test */
import React from 'react';
import { shallow } from 'enzyme';

import {
  AWSCredentialsPrimitive,
  mapStateToProps,
  mapDispatchToProps,
} from '../../server/awsCredentials';
import { SERVER_FIELDS, serverActions } from '../../state/actions';
import { initialServerStates } from '../../utils/definitions/serverDefinitions';
import getByTestId from '../../__testUtils__/getByTestId';

describe('<AWSCredentials />', () => {
  let defaultProps;

  const renderShallowWithProps = customProps => {
    const renderProps = {
      ...defaultProps,
      ...customProps,
    };
    return shallow(
      <AWSCredentialsPrimitive
        serverInfo={renderProps.serverInfo}
        onEditServerInfo={renderProps.onEditServerInfo}
        onValidateAws={renderProps.onValidateAws}
        onLogoutAws={renderProps.onLogoutAws}
        onKeyPress={renderProps.onKeyPress}
      />
    );
  };

  beforeEach(() => {
    defaultProps = {
      serverInfo: { ...initialServerStates.serverInfo },
      onEditServerInfo: () => {},
      onValidateAws: () => {},
      onLogoutAws: () => {},
    };
  });

  it('should render with required props', () => {
    const wrapper = renderShallowWithProps();
    expect(wrapper.find('.server-credentials')).toHaveLength(1);
    const accessKeyInput = getByTestId(
      wrapper,
      'AWSCredentials.accessKeyInput'
    );
    const secretKeyInput = getByTestId(
      wrapper,
      'AWSCredentials.secretKeyInput'
    );
    const submitButton = getByTestId(wrapper, 'AWSCredentials.submitButton');
    expect(accessKeyInput).toHaveLength(1);
    expect(accessKeyInput.prop('value')).toBe('');
    expect(secretKeyInput).toHaveLength(1);
    expect(secretKeyInput.prop('value')).toBe('');
    expect(submitButton).toHaveLength(1);
    expect(submitButton.text()).toBe('Submit');
    expect(submitButton.prop('onKeyPress')).toBeDefined();
    submitButton.simulate('keyPress');
  });

  it('should render with non-default props', () => {
    const customProps = {
      serverInfo: {
        ...initialServerStates.serverInfo,
        credentials: {
          ...initialServerStates.awsCredentials,
          AWSAccessKey: 'testAccessKey',
          AWSSecretKey: 'testSecretKey',
          accessToken: 'test',
        },
      },
      onKeyPress: jest.fn(),
    };
    const wrapper = renderShallowWithProps(customProps);
    const accessKeyInput = getByTestId(
      wrapper,
      'AWSCredentials.accessKeyInput'
    );
    const secretKeyInput = getByTestId(
      wrapper,
      'AWSCredentials.secretKeyInput'
    );
    const submitButton = getByTestId(wrapper, 'AWSCredentials.submitButton');
    expect(accessKeyInput).toHaveLength(1);
    expect(accessKeyInput.prop('value')).toBe('testAccessKey');
    expect(secretKeyInput).toHaveLength(1);
    expect(secretKeyInput.prop('value')).toBe('testSecretKey');
    expect(submitButton).toHaveLength(1);
    expect(submitButton.text()).toBe('Log out');
    expect(submitButton.prop('onKeyPress')).toBeDefined();
    submitButton.simulate('keyPress');
    expect(customProps.onKeyPress).toHaveBeenCalled();
  });

  describe('submit button', () => {
    test('should render as a logout button when validated', () => {
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
      const submitButton = getByTestId(wrapper, 'AWSCredentials.submitButton');
      expect(submitButton).toHaveLength(1);
      expect(submitButton.text()).toBe('Log out');
    });

    test('should render as a login button when not validated', () => {
      const customProps = {
        serverInfo: {
          ...initialServerStates.serverInfo,
          credentials: {
            ...initialServerStates.awsCredentials,
            accessToken: null,
          },
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      const submitButton = getByTestId(wrapper, 'AWSCredentials.submitButton');
      expect(submitButton).toHaveLength(1);
      expect(submitButton.text()).toBe('Submit');
    });

    test('should proceed with logout when confirmed by dialog', async () => {
      const customProps = {
        serverInfo: {
          ...initialServerStates.serverInfo,
          credentials: {
            ...initialServerStates.awsCredentials,
            accessToken: 'test',
          },
          coreServer: {
            ...initialServerStates.coreServer,
            path: 'testPath',
          },
        },
        onLogoutAws: jest.fn(),
      };
      let bridgeCalled;
      const Bridge = {
        confirmDialog: jest.fn(() => {
          bridgeCalled = Promise.resolve(true);
          return bridgeCalled;
        }),
      };
      global.window.Bridge = Bridge;
      const wrapper = renderShallowWithProps(customProps);
      const submitButton = getByTestId(wrapper, 'AWSCredentials.submitButton');
      const ev = {
        preventDefault: jest.fn(),
      };
      submitButton.simulate('click', ev);
      expect(ev.preventDefault).toHaveBeenCalled();
      expect(Bridge.confirmDialog).toHaveBeenCalled();
      await bridgeCalled;
      expect(customProps.onLogoutAws).toHaveBeenCalledWith('testPath');
      delete global.window.Bridge;
    });

    test('should stop with logout when not denied by dialog', async () => {
      const customProps = {
        serverInfo: {
          ...initialServerStates.serverInfo,
          credentials: {
            ...initialServerStates.awsCredentials,
            accessToken: 'test',
          },
          coreServer: {
            ...initialServerStates.coreServer,
            path: 'testPath',
          },
        },
        onLogoutAws: jest.fn(),
      };
      let bridgeCalled;
      const Bridge = {
        confirmDialog: jest.fn(() => {
          bridgeCalled = Promise.resolve(false);
          return bridgeCalled;
        }),
      };
      global.window.Bridge = Bridge;
      const wrapper = renderShallowWithProps(customProps);
      const submitButton = getByTestId(wrapper, 'AWSCredentials.submitButton');
      const ev = {
        preventDefault: jest.fn(),
      };
      submitButton.simulate('click', ev);
      expect(ev.preventDefault).toHaveBeenCalled();
      expect(Bridge.confirmDialog).toHaveBeenCalled();
      await bridgeCalled;
      expect(customProps.onLogoutAws).not.toHaveBeenCalledWith('testPath');
      delete global.window.Bridge;
    });

    test('should proceed with login when clicked', () => {
      const customProps = {
        serverInfo: {
          ...initialServerStates.serverInfo,
          credentials: {
            AWSAccessKey: 'testAccess',
            AWSSecretKey: 'testSecret',
            accessToken: null,
          },
        },
        onValidateAws: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const submitButton = getByTestId(wrapper, 'AWSCredentials.submitButton');
      const ev = {
        preventDefault: jest.fn(),
      };
      submitButton.simulate('click', ev);
      expect(ev.preventDefault).toHaveBeenCalled();
      expect(customProps.onValidateAws).toHaveBeenCalledWith(
        customProps.serverInfo.credentials
      );
    });
  });

  describe('should handle editing', () => {
    test('aws access key', () => {
      const customProps = {
        serverInfo: {
          ...initialServerStates.serverInfo,
          credentials: {
            AWSAccessKey: 'testAccess',
            AWSSecretKey: 'testSecret',
            accessToken: null,
          },
        },
        onEditServerInfo: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const accessKeyInput = getByTestId(
        wrapper,
        'AWSCredentials.accessKeyInput'
      );
      accessKeyInput.simulate('change', { target: { value: 'newAccess' } });
      expect(customProps.onEditServerInfo).toHaveBeenCalledWith(
        SERVER_FIELDS.EDIT_AWS_ACCESS_KEY,
        'newAccess'
      );
    });

    test('aws secret key', () => {
      const customProps = {
        serverInfo: {
          ...initialServerStates.serverInfo,
          credentials: {
            AWSAccessKey: 'testAccess',
            AWSSecretKey: 'testSecret',
            accessToken: null,
          },
        },
        onEditServerInfo: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const secretKeyInput = getByTestId(
        wrapper,
        'AWSCredentials.secretKeyInput'
      );
      secretKeyInput.simulate('change', { target: { value: 'newSecret' } });
      expect(customProps.onEditServerInfo).toHaveBeenCalledWith(
        SERVER_FIELDS.EDIT_AWS_SECRET_KEY,
        'newSecret'
      );
    });
  });

  test('map state to props should return correct structure', () => {
    const state = {
      serverInfo: initialServerStates.serverInfo,
      extra: 'item',
    };
    const actual = mapStateToProps(state);
    expect(actual).toEqual({
      serverInfo: initialServerStates.serverInfo,
    });
  });

  test('map dispatch to props should return correct structure', () => {
    const dispatch = jest.fn();
    const actual = mapDispatchToProps(dispatch);
    actual.onEditServerInfo('test_field', 'test_value');
    actual.onValidateAws({ access: 'test', secret: 'test' });
    actual.onLogoutAws('logout');

    expect(dispatch).toHaveBeenNthCalledWith(
      1,
      serverActions.edit(null, 'test_field', 'test_value')
    );
    expect(dispatch).toHaveBeenNthCalledWith(2, expect.any(Function));
    expect(dispatch).toHaveBeenNthCalledWith(3, expect.any(Function));
  });
});
