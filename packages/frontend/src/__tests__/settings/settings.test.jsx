/* global describe it expect beforeEach afterEach jest test */
import React from 'react';
import { shallow } from 'enzyme';

import { SettingsPrimitive, mapStateToProps, mapDispatchToProps } from '../../settings/settings';
import { SETTINGS_FIELDS, settingsActions } from '../../state/actions';
import { initialSettingsStates } from '../../utils/definitions/settingsDefinitions';
import { initialProfileStates } from '../../utils/definitions/profileDefinitions';
import getAllSizes from '../../constants/getAllSizes';

describe('<Settings />', () => {
  let defaultProps;

  const renderShallowWithProps = customProps => {
    const renderProps = {
      ...defaultProps,
      ...customProps,
    };
    return shallow(
      <SettingsPrimitive
        profiles={renderProps.profiles}
        settings={renderProps.settings}
        onSettingsChange={renderProps.onSettingsChange}
        onSaveDefaults={renderProps.onSaveDefaults}
        onClearDefaults={renderProps.onClearDefaults}
        onKeyPress={renderProps.onKeyPress}
        errors={renderProps.settings.errors}
      />,
    );
  };

  beforeEach(() => {
    defaultProps = {
      profiles: [
        { ...initialProfileStates.profile, id: 1, profileName: 'profile1' },
        { ...initialProfileStates.profile, id: 2, profileName: 'profile2' },
        { ...initialProfileStates.profile, id: 3, profileName: 'profile3' },
      ],
      settings: {
        ...initialSettingsStates.settings,
      },
      errors: {
        ...initialSettingsStates.settingsErrors,
      },
      onSettingsChange: () => {},
      onSaveDefaults: () => {},
      onClearDefaults: () => {},
    };
  });

  it('renders with required props', () => {
    const wrapper = renderShallowWithProps();
    expect(wrapper.find('#proxy-button-captcha')).toHaveLength(1);
    expect(wrapper.find('#proxy-button-captcha-close')).toHaveLength(1);
    expect(wrapper.find('#discord-input')).toHaveLength(1);
    expect(wrapper.find('#slack-input')).toHaveLength(1);
    expect(wrapper.find('#default-profile')).toHaveLength(1);
    expect(wrapper.find('#default-sizes')).toHaveLength(1);
    expect(wrapper.find('#save-defaults')).toHaveLength(1);
    expect(wrapper.find('#clear-defaults')).toHaveLength(1);
    expect(wrapper.find('#monitor-input')).toHaveLength(1);
    expect(wrapper.find('#error-input')).toHaveLength(1);
  });

  it('renders with non-default props', () => {
    const customProps = {
      settings: {
        ...initialSettingsStates.settings,
        defaults: {
          profile: { ...initialProfileStates.profile, id: 1, profileName: 'profile1' },
          sizes: [
            { value: '4', label: '4.0' },
            { value: '4.5', label: '4.5' },
            { value: '5', label: '5.0' },
          ],
        },
        discord: 'discordTest',
        slack: 'slackTest',
      },
    };
    const wrapper = renderShallowWithProps(customProps);
    expect(wrapper.find('#proxy-button-captcha')).toHaveLength(1);
    expect(wrapper.find('#proxy-button-captcha-close')).toHaveLength(1);
    expect(wrapper.find('#discord-input')).toHaveLength(1);
    expect(wrapper.find('#slack-input')).toHaveLength(1);
    expect(wrapper.find('#default-profile')).toHaveLength(1);
    expect(wrapper.find('#default-sizes')).toHaveLength(1);
    expect(wrapper.find('#save-defaults')).toHaveLength(1);
    expect(wrapper.find('#clear-defaults')).toHaveLength(1);
    expect(wrapper.find('#monitor-input')).toHaveLength(1);
    expect(wrapper.find('#error-input')).toHaveLength(1);

    expect(wrapper.find('#discord-input').prop('value')).toBe('discordTest');
    expect(wrapper.find('#slack-input').prop('value')).toBe('slackTest');
    expect(wrapper.find('#default-profile').prop('value')).toEqual({
      value: 1,
      label: 'profile1',
    });
    expect(wrapper.find('#default-sizes').prop('value')).toEqual([
      { value: '4', label: '4.0' },
      { value: '4.5', label: '4.5' },
      { value: '5', label: '5.0' },
    ]);
    wrapper.find('#save-defaults').simulate('keyPress');
  });

  describe('calls correct handler when editing', () => {
    test('default profile', () => {
      const customProps = {
        onSettingsChange: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const profileSelector = wrapper.find('#default-profile');
      expect(profileSelector.prop('value')).toBeNull();
      expect(profileSelector.prop('onChange')).toBeDefined();
      expect(profileSelector.prop('options')).toEqual([
        { value: 1, label: 'profile1' },
        { value: 2, label: 'profile2' },
        { value: 3, label: 'profile3' },
      ]);

      profileSelector.simulate('change', { value: 1 });
      expect(customProps.onSettingsChange).toHaveBeenCalledWith({
        field: SETTINGS_FIELDS.EDIT_DEFAULT_PROFILE,
        value: defaultProps.profiles[0],
      });

      customProps.onSettingsChange.mockClear();
      profileSelector.simulate('change', { value: 4 });
      expect(customProps.onSettingsChange).toHaveBeenCalledWith({
        field: SETTINGS_FIELDS.EDIT_DEFAULT_PROFILE,
        value: undefined,
      });
    });

    test('default sizes', () => {
      const customProps = {
        onSettingsChange: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const sizeSelector = wrapper.find('#default-sizes');
      expect(sizeSelector.prop('value')).toEqual([]);
      expect(sizeSelector.prop('onChange')).toBeDefined();
      expect(sizeSelector.prop('options')).toEqual(getAllSizes());

      sizeSelector.simulate('change', [{ value: '4', label: '4.0' }]);
      expect(customProps.onSettingsChange).toHaveBeenCalledWith({
        field: SETTINGS_FIELDS.EDIT_DEFAULT_SIZES,
        value: [{ value: '4', label: '4.0' }],
      });

      customProps.onSettingsChange.mockClear();
      sizeSelector.simulate('change', [
        { value: '4', label: '4.0' },
        { value: '4.5', label: '4.5' },
        { value: '5', label: '5.0' },
      ]);
      expect(customProps.onSettingsChange).toHaveBeenCalledWith({
        field: SETTINGS_FIELDS.EDIT_DEFAULT_SIZES,
        value: [
          { value: '4', label: '4.0' },
          { value: '4.5', label: '4.5' },
          { value: '5', label: '5.0' },
        ],
      });
    });

    test('discord field', () => {
      const customProps = {
        onSettingsChange: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const discordInput = wrapper.find('#discord-input');
      expect(discordInput.prop('value')).toBe('');
      expect(discordInput.prop('onChange')).toBeDefined();

      discordInput.simulate('change', { target: { value: 'test' } });
      expect(customProps.onSettingsChange).toHaveBeenCalledWith({
        field: SETTINGS_FIELDS.EDIT_DISCORD,
        value: 'test',
      });
    });

    test('slack field', () => {
      const customProps = {
        onSettingsChange: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const slackInput = wrapper.find('#slack-input');
      expect(slackInput.prop('value')).toBe('');
      expect(slackInput.prop('onChange')).toBeDefined();

      slackInput.simulate('change', { target: { value: 'test' } });
      expect(customProps.onSettingsChange).toHaveBeenCalledWith({
        field: SETTINGS_FIELDS.EDIT_SLACK,
        value: 'test',
      });
    });
  });

  describe('handles', () => {
    test('saving defaults', () => {
      const customProps = {
        settings: {
          ...initialSettingsStates.settings,
          defaults: {
            profile: { ...initialProfileStates.profile, id: 1, profileName: 'profile1' },
            sizes: [{ value: '4', label: '4.0' }],
          },
        },
        onSaveDefaults: jest.fn(),
        onKeyPress: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const saveButton = wrapper.find('#save-defaults');
      saveButton.simulate('keyPress');
      expect(customProps.onKeyPress).toHaveBeenCalled();
      saveButton.simulate('click');
      expect(customProps.onSaveDefaults).toHaveBeenCalledWith(customProps.settings.defaults);
    });

    test('clearing defaults', () => {
      const customProps = {
        onClearDefaults: jest.fn(),
        onKeyPress: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const clearButton = wrapper.find('#clear-defaults');
      clearButton.simulate('keyPress');
      expect(customProps.onKeyPress).toHaveBeenCalled();
      clearButton.simulate('click');
      expect(customProps.onClearDefaults).toHaveBeenCalledWith(SETTINGS_FIELDS.CLEAR_DEFAULTS);
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
      const button = wrapper.find('#proxy-button-captcha');
      button.simulate('click');
      expect(Bridge.launchCaptchaHarvester).toHaveBeenCalled();
    });

    test('close all harvester button calls correct function', () => {
      const button = wrapper.find('#proxy-button-captcha-close');
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

    test('launch youtube button displays error', () => {
      const button = wrapper.find('#proxy-button-captcha');
      button.simulate('click');
      expect(consoleSpy).toHaveBeenCalled();
    });

    test('launch harvester button displays error', () => {
      const button = wrapper.find('#proxy-button-captcha-close');
      button.simulate('click');
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  test('map state to props returns the correct structure', () => {
    const state = {
      profiles: [
        { ...initialProfileStates.profile, id: 1, profileName: 'profile1' },
        { ...initialProfileStates.profile, id: 2, profileName: 'profile2' },
        { ...initialProfileStates.profile, id: 3, profileName: 'profile3' },
      ],
      settings: {
        ...initialSettingsStates.settings,
        defaults: {
          profile: { ...initialProfileStates.profile, id: 1, profileName: 'profile1' },
          sizes: [
            { value: '4', label: '4.0' },
            { value: '4.5', label: '4.5' },
            { value: '5', label: '5.0' },
          ],
        },
        discord: 'discordTest',
        slack: 'slackTest',
      },
      extra: 'fields',
      that: "aren't included",
    };
    const expected = {
      profiles: state.profiles,
      settings: state.settings,
      errors: state.settings.errors,
    };
    expect(mapStateToProps(state)).toEqual(expected);
  });

  test('map dispatch to props returns the correct structure', () => {
    const dispatch = jest.fn();
    const actual = mapDispatchToProps(dispatch);
    actual.onSettingsChange({
      field: SETTINGS_FIELDS.EDIT_DISCORD,
      value: 'test',
    });
    actual.onSaveDefaults({
      profile: {},
      sizes: [],
    });
    actual.onClearDefaults(SETTINGS_FIELDS.CLEAR_DEFAULTS);
    expect(dispatch).toHaveBeenNthCalledWith(
      1,
      settingsActions.edit(SETTINGS_FIELDS.EDIT_DISCORD, 'test'),
    );
    expect(dispatch).toHaveBeenNthCalledWith(
      2,
      settingsActions.save({
        profile: {},
        sizes: [],
      }),
    );
    expect(dispatch).toHaveBeenNthCalledWith(3, settingsActions.clear(SETTINGS_FIELDS.CLEAR));
  });
});
