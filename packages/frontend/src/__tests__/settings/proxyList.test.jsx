/* global describe it expect beforeEach jest test */
import React from 'react';
import { shallow, mount } from 'enzyme';

import { ProxyListPrimitive, mapStateToProps, mapDispatchToProps } from '../../settings/proxyList';
import { SETTINGS_FIELDS, settingsActions } from '../../state/actions';
import { initialSettingsStates } from '../../utils/definitions/settingsDefinitions';

describe('<ProxyList />', () => {
  let defaultProps;

  const getWrapper = (method, customProps) => {
    const renderProps = {
      ...defaultProps,
      ...customProps,
    };
    return method(
      <ProxyListPrimitive
        id={renderProps.id}
        proxies={renderProps.proxies}
        errors={renderProps.errors}
        onUpdateProxies={renderProps.onUpdateProxies}
      />,
    );
  };

  const renderShallowWithProps = customProps => getWrapper(shallow, customProps);

  const renderMountWithProps = customProps => getWrapper(mount, customProps);

  beforeEach(() => {
    defaultProps = {
      proxies: initialSettingsStates.settings.proxies,
      errors: initialSettingsStates.settingsErrors.proxies,
      onUpdateProxies: () => {},
    };
  });

  it('should render with required props', () => {
    const wrapper = renderShallowWithProps();
    expect(wrapper.prop('className')).toBe('proxy-list__input-group--text');
    expect(wrapper.prop('onInput')).toBeDefined();
    expect(wrapper.prop('onFocus')).toBeDefined();
    expect(wrapper.prop('onBlur')).toBeDefined();
    expect(wrapper.prop('onPaste')).toBeDefined();
    expect(wrapper.prop('contentEditable')).toBeTruthy();
    expect(wrapper.prop('dangerouslySetInnerHTML')).toEqual({
      __html: '<div><br /></div>',
    });
    expect(wrapper.state('proxies')).toEqual([]);
    expect(wrapper.state('editing')).toBeFalsy();
    expect(wrapper.state('reduxUpdate')).toBeFalsy();
  });

  it('should render with given class name', () => {
    const wrapper = renderShallowWithProps({ className: 'proxy-list__input-group--text' });
    expect(wrapper.prop('className')).toBe('proxy-list__input-group--text');
  });

  it('should render proxies when not editing', () => {
    const customProps = {
      proxies: [
        'test',
        'testinvalid',
        'testvalid',
        '<script>invalid</script><div>div</div>testsanitize',
      ],
      errors: [1],
    };
    const expectedInnerHtml =
      '<div>test</div><div class="invalidProxy">testinvalid</div>' +
      '<div>testvalid</div><div>divtestsanitize</div>';
    const wrapper = renderShallowWithProps(customProps);
    expect(wrapper.state('proxies')).toEqual(customProps.proxies);
    expect(wrapper.state('editing')).toBeFalsy();
    expect(wrapper.prop('dangerouslySetInnerHTML')).toEqual({
      __html: expectedInnerHtml,
    });
  });

  it('should render proxies when editing', () => {
    const customProps = {
      proxies: [
        'test',
        'testinvalid',
        'testvalid',
        '<script>invalid</script><div>div</div>testsanitize',
      ],
      errors: [1],
    };
    const expectedInnerHtml =
      '<div>test</div><div>testinvalid</div><div>testvalid</div><div>divtestsanitize</div>';
    const wrapper = renderShallowWithProps(customProps);
    wrapper.setState({
      editing: true,
    });
    expect(wrapper.state('proxies')).toEqual(customProps.proxies);
    expect(wrapper.state('editing')).toBeTruthy();
    expect(wrapper.prop('dangerouslySetInnerHTML')).toEqual({
      __html: expectedInnerHtml,
    });
  });

  it('should handle input', () => {
    const wrapper = renderMountWithProps();
    expect(wrapper.state('reduxUpdate')).toBeFalsy();
    expect(wrapper.state('proxies')).toEqual([]);

    const component = wrapper.instance();
    component.domNode.current.innerText =
      '<div>testing</div> \n and this \n\n \n<script>nothing</script> \n';
    wrapper.simulate('input');
    expect(wrapper.state('reduxUpdate')).toBeTruthy();
    expect(wrapper.state('proxies')).toEqual(['testing', 'and this']);
  });

  it('should not respond to input when dom node is not defined', () => {
    const wrapper = renderShallowWithProps();
    expect(wrapper.state('reduxUpdate')).toBeFalsy();
    expect(wrapper.state('proxies')).toEqual([]);

    wrapper.simulate('input');
    expect(wrapper.state('reduxUpdate')).toBeFalsy();
    expect(wrapper.state('proxies')).toEqual([]);
  });

  it('should handle focus', () => {
    const wrapper = renderShallowWithProps();
    expect(wrapper.state('editing')).toBeFalsy();
    wrapper.simulate('focus');
    expect(wrapper.state('editing')).toBeTruthy();
  });

  describe('should handle blur', () => {
    test('when there is no redux update', () => {
      const customProps = {
        onUpdateProxies: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      wrapper.setState({
        editing: true,
        proxies: ['test '],
      });
      expect(wrapper.state('editing')).toBeTruthy();
      expect(wrapper.state('reduxUpdate')).toBeFalsy();

      wrapper.simulate('blur');
      expect(wrapper.state('editing')).toBeFalsy();
      expect(wrapper.state('reduxUpdate')).toBeFalsy();
      expect(customProps.onUpdateProxies).not.toHaveBeenCalled();
    });

    test('when there is a redux update', () => {
      const customProps = {
        onUpdateProxies: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      wrapper.setState({
        editing: true,
        reduxUpdate: true,
        proxies: [' test', 'test2 '],
      });
      expect(wrapper.state('editing')).toBeTruthy();
      expect(wrapper.state('reduxUpdate')).toBeTruthy();

      wrapper.simulate('blur');
      expect(wrapper.state('editing')).toBeFalsy();
      expect(wrapper.state('reduxUpdate')).toBeFalsy();
      expect(customProps.onUpdateProxies).toHaveBeenCalledTimes(1);
      expect(customProps.onUpdateProxies.mock.calls[0][0]).toEqual(['test', 'test2']);
    });
  });

  describe('should handle paste', () => {
    const performComponentSetup = () => {
      const wrapper = renderMountWithProps();
      const domNodeRef = wrapper.instance().domNode;
      expect(wrapper.state('reduxUpdate')).toBeFalsy();
      expect(wrapper.state('editing')).toBeFalsy();
      expect(wrapper.state('proxies')).toEqual([]);

      wrapper.simulate('focus');
      expect(wrapper.state('reduxUpdate')).toBeFalsy();
      expect(wrapper.state('editing')).toBeTruthy();
      expect(wrapper.state('proxies')).toEqual([]);

      return { wrapper, domNodeRef };
    };

    const performWindowDocumentSetup = (supportedCommand, execCommandHandler, clipboardData) => {
      global.__registerSupportedCommand(supportedCommand);
      global.__registerNextExecCommandHandler(execCommandHandler);
      global.window.clipboardData = clipboardData;
    };

    const performWindowDocumentCleanup = supportedCommand => {
      // clean up document implementation to prevent cross test pollution
      global.__deregisterSupportedCommand(supportedCommand);
      global.__clearNextExecCommandHandler();
      delete global.window.clipboardData;
    };

    test('when getting event clipboard data', () => {
      const ev = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        clipboardData: {
          getData: jest.fn(type => {
            if (type === 'text') {
              return '<div>testing</div> \n and this \n\n \n<script>nothing</script> \n';
            }
            return null;
          }),
        },
      };
      const { wrapper, domNodeRef } = performComponentSetup(ev);

      // setup expected document implementation
      const execCommandHandler = jest.fn((name, ui, arg) => {
        domNodeRef.current.innerText = arg;
        return true;
      });
      performWindowDocumentSetup('insertText', execCommandHandler);

      wrapper.simulate('paste', ev);
      expect(ev.preventDefault).toHaveBeenCalled();
      expect(ev.stopPropagation).toHaveBeenCalled();
      expect(ev.clipboardData.getData).toHaveBeenCalledWith('text');
      expect(execCommandHandler).toHaveBeenCalledWith(
        'insertText',
        false,
        'testing \n and this \n\n \n \n',
      );
      expect(wrapper.state('reduxUpdate')).toBeTruthy();
      expect(wrapper.state('editing')).toBeTruthy();
      expect(wrapper.state('proxies')).toEqual(['testing', 'and this']);

      performWindowDocumentCleanup('insertText');
    });

    test('when getting window clipboard data', () => {
      const ev = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      };
      const { wrapper, domNodeRef } = performComponentSetup(ev);

      // setup expected document implementation
      const execCommandHandler = jest.fn((name, ui, arg) => {
        domNodeRef.current.innerText = arg;
        return true;
      });
      performWindowDocumentSetup('insertText', execCommandHandler, {
        getData: jest.fn(type => {
          if (type === 'text') {
            return '<div>testing</div> \n and this \n\n \n<script>nothing</script> \n';
          }
          return null;
        }),
      });

      wrapper.simulate('paste', ev);
      expect(ev.preventDefault).toHaveBeenCalled();
      expect(ev.stopPropagation).toHaveBeenCalled();
      expect(global.window.clipboardData.getData).toHaveBeenCalledWith('text');
      expect(execCommandHandler).toHaveBeenCalledWith(
        'insertText',
        false,
        'testing \n and this \n\n \n \n',
      );
      expect(wrapper.state('reduxUpdate')).toBeTruthy();
      expect(wrapper.state('editing')).toBeTruthy();
      expect(wrapper.state('proxies')).toEqual(['testing', 'and this']);

      performWindowDocumentCleanup('insertText');
    });

    test('when insertText is not supported', () => {
      const ev = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        clipboardData: {
          getData: jest.fn(type => {
            if (type === 'text') {
              return '<div>testing</div> \n and this \n\n \n<script>nothing</script> \n';
            }
            return null;
          }),
        },
      };
      const { wrapper, domNodeRef } = performComponentSetup(ev);

      // setup expected document implementation
      const execCommandHandler = jest.fn((name, ui, arg) => {
        domNodeRef.current.innerText = arg;
        return true;
      });
      performWindowDocumentSetup('paste', execCommandHandler);

      wrapper.simulate('paste', ev);
      expect(ev.preventDefault).toHaveBeenCalled();
      expect(ev.stopPropagation).toHaveBeenCalled();
      expect(ev.clipboardData.getData).toHaveBeenCalledWith('text');
      expect(execCommandHandler).toHaveBeenCalledWith(
        'paste',
        false,
        'testing \n and this \n\n \n \n',
      );
      expect(wrapper.state('reduxUpdate')).toBeTruthy();
      expect(wrapper.state('editing')).toBeTruthy();
      expect(wrapper.state('proxies')).toEqual(['testing', 'and this']);

      performWindowDocumentCleanup('paste');
    });
  });

  it('should set a ref', () => {
    const wrapper = renderMountWithProps();
    const component = wrapper.instance();
    expect(component.domNode.current).toBeDefined();
  });

  it('should sanitize input correctly', () => {
    const dirty = "<script>console.log('hello');</script><div>Hello</div>World";
    const expected = 'HelloWorld';
    expect(ProxyListPrimitive.sanitize(dirty)).toBe(expected);
  });

  test('map state to props should return correct structure', () => {
    const state1 = {
      settings: {
        ...initialSettingsStates.settings,
        proxies: ['test1', 'test2'],
        errors: {
          proxies: null,
        },
        extra: 'data',
      },
      extra: 'data',
    };
    const state2 = {
      settings: {
        proxies: ['test1', 'test2'],
        errors: {
          proxies: null,
        },
        extra: 'data',
      },
      extra: 'data',
    };
    const state3 = {
      settings: {
        ...initialSettingsStates.settings,
        proxies: ['test1', 'test2'],
        errors: {
          proxies: [0, 1],
        },
        extra: 'data',
      },
      extra: 'data',
    };
    const actual1 = mapStateToProps(state1);
    const actual2 = mapStateToProps(state2);
    const actual3 = mapStateToProps(state3);

    expect(actual1).toEqual({
      proxies: state1.settings.proxies,
      errors: [],
    });

    expect(actual2).toEqual({
      proxies: state2.settings.proxies,
      errors: [],
    });

    expect(actual3).toEqual({
      proxies: state3.settings.proxies,
      errors: state3.settings.errors.proxies,
    });
  });

  test('map dispatch to props should return correct structure', () => {
    const dispatch = jest.fn();
    const expectedAction = settingsActions.edit(SETTINGS_FIELDS.EDIT_PROXIES, 'data');
    const actual = mapDispatchToProps(dispatch);
    actual.onUpdateProxies('data');
    expect(dispatch).toHaveBeenCalledWith(expectedAction);
  });
});
