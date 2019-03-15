/* global describe it expect beforeEach afterEach jest test */
import React from 'react';
import { shallow } from 'enzyme';

import { SettingsPrimitive, mapStateToProps, mapDispatchToProps } from '../../settings/settings';
import { SETTINGS_FIELDS, settingsActions } from '../../state/actions';
import { initialSettingsStates } from '../../utils/definitions/settingsDefinitions';
import { initialState } from '../../state/reducers';

describe('<Settings />', () => {
  let defaultProps;

  const renderShallowWithProps = customProps => {
    const renderProps = {
      ...defaultProps,
      ...customProps,
    };
    return shallow(
      <SettingsPrimitive
        onSettingsChange={renderProps.onSettingsChange}
        settings={renderProps.settings}
        theme={renderProps.theme}
        errors={renderProps.settings.errors}
      />,
    );
  };

  beforeEach(() => {
    defaultProps = {
      onSettingsChange: () => {},
      settings: {
        ...initialSettingsStates.settings,
      },
      errors: {
        ...initialSettingsStates.settingsErrors,
      },
      theme: {
        ...initialState.theme,
      },
    };
  });

  it('renders with required props', () => {
    const wrapper = renderShallowWithProps();
    expect(wrapper.find('.settings__button--open-captcha')).toHaveLength(1);
    expect(wrapper.find('.settings__button--close-captcha')).toHaveLength(1);
    expect(wrapper.find('.settings__input-group--monitor-delay')).toHaveLength(1);
    expect(wrapper.find('.settings__input-group--error-delay')).toHaveLength(1);
  });

  it('renders with non-default props', () => {
    const customProps = {
      settings: {
        ...initialSettingsStates.settings,
      },
    };
    const wrapper = renderShallowWithProps(customProps);
    expect(wrapper.find('.settings__button--open-captcha')).toHaveLength(1);
    expect(wrapper.find('.settings__button--close-captcha')).toHaveLength(1);
    expect(wrapper.find('.settings__input-group--monitor-delay')).toHaveLength(1);
    expect(wrapper.find('.settings__input-group--error-delay')).toHaveLength(1);
  });

  describe('calls correct handler when editing', () => {
    test('error delay', () => {
      const customProps = {
        onSettingsChange: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const errorInput = wrapper.find('.settings__input-group--error-delay');
      expect(errorInput.prop('value')).toBe(1500);
      expect(errorInput.prop('onChange')).toBeDefined();

      errorInput.simulate('change', { target: { value: '1000' } });
      expect(customProps.onSettingsChange).toHaveBeenCalledWith({
        field: SETTINGS_FIELDS.EDIT_ERROR_DELAY,
        value: '1000',
      });
    });

    test('monitor delay', () => {
      const customProps = {
        onSettingsChange: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const monitorInput = wrapper.find('.settings__input-group--monitor-delay');
      expect(monitorInput.prop('value')).toBe(1500);
      expect(monitorInput.prop('onChange')).toBeDefined();

      monitorInput.simulate('change', { target: { value: '1000' } });
      expect(customProps.onSettingsChange).toHaveBeenCalledWith({
        field: SETTINGS_FIELDS.EDIT_MONITOR_DELAY,
        value: '1000',
      });
    });
  });

  describe('when window.Bridge is available', () => {
    let Bridge;
    let wrapper;

    beforeEach(() => {
      Bridge = {
        closeAllCaptchaWindows: jest.fn(),
        launchCaptchaHarvester: jest.fn(),
      };
      global.window.Bridge = Bridge;
      wrapper = renderShallowWithProps();
    });

    afterEach(() => {
      delete global.window.Bridge;
    });

    test('launch captcha button calls correct function', () => {
      const button = wrapper.find('.settings__button--open-captcha');
      button.simulate('click');
      expect(Bridge.launchCaptchaHarvester).toHaveBeenCalled();
    });

    test('close all harvester button calls correct function', () => {
      const button = wrapper.find('.settings__button--close-captcha');
      button.simulate('click');
      expect(Bridge.closeAllCaptchaWindows).toHaveBeenCalled();
    });
  });

  describe('when window.Bridge is unavailable', () => {
    let wrapper;
    let consoleSpy;

    beforeEach(() => {
      wrapper = renderShallowWithProps();
      consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test('launch harvester button displays error', () => {
      const button = wrapper.find('.settings__button--open-captcha');
      button.simulate('click');
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  test('map state to props returns the correct structure', () => {
    const state = {
      settings: {
        ...initialSettingsStates.settings,
      },
      theme: {
        ...initialState.theme,
      },
      extra: 'fields',
      that: "aren't included",
    };
    const expected = {
      settings: state.settings,
      theme: state.theme,
      errors: state.settings.errors,
    };
    expect(mapStateToProps(state)).toEqual(expected);
  });

  test('map dispatch to props returns the correct structure', () => {
    const dispatch = jest.fn();
    const actual = mapDispatchToProps(dispatch);
    actual.onSettingsChange({
      field: SETTINGS_FIELDS.EDIT_ERROR_DELAY,
      value: 1000,
    });
    expect(dispatch).toHaveBeenNthCalledWith(
      1,
      settingsActions.edit(SETTINGS_FIELDS.EDIT_ERROR_DELAY, 1000),
    );
  });
});
