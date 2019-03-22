/* global describe it expect beforeEach afterEach jest test */
import React from 'react';
import { shallow } from 'enzyme';

import { WebhooksPrimitive, mapStateToProps, mapDispatchToProps } from '../../settings/webhooks';
import { SETTINGS_FIELDS, settingsActions } from '../../state/actions';
import initialSettingsStates from '../../state/initial/settings';

describe('<Webhooks />', () => {
  let defaultProps;

  const renderShallowWithProps = customProps => {
    const renderProps = {
      ...defaultProps,
      ...customProps,
    };
    return shallow(
      <WebhooksPrimitive
        onSettingsChange={renderProps.onSettingsChange}
        onTestDiscord={renderProps.onTestDiscord}
        onTestSlack={renderProps.onTestSlack}
        discord={renderProps.discord}
        slack={renderProps.slack}
        onKeyPress={renderProps.onKeyPress}
        errors={renderProps.errors}
      />,
    );
  };

  beforeEach(() => {
    defaultProps = {
      discord: initialSettingsStates.settings.discord,
      slack: initialSettingsStates.settings.slack,
      errors: {
        ...initialSettingsStates.settingsErrors.defaults,
      },
      onSettingsChange: () => {},
      onTestDiscord: () => {},
      onTestSlack: () => {},
      onKeyPress: () => {},
    };
  });

  it('renders with required props', () => {
    const wrapper = renderShallowWithProps();
    expect(wrapper.find('.settings__input-group--webhook__discord')).toHaveLength(1);
    expect(wrapper.find('.settings__input-group--webhook__slack')).toHaveLength(1);
  });

  it('renders with non-default props', () => {
    const customProps = {
      discord: 'discordTest',
      slack: 'slackTest',
      onKeyPress: jest.fn(),
    };
    const wrapper = renderShallowWithProps(customProps);
    expect(wrapper.find('.settings__input-group--webhook__discord')).toHaveLength(1);
    expect(wrapper.find('.settings__input-group--button-discord')).toHaveLength(1);
    expect(wrapper.find('.settings__input-group--webhook__slack')).toHaveLength(1);
    expect(wrapper.find('.settings__input-group--button-slack')).toHaveLength(1);
    expect(wrapper.find('.settings__input-group--webhook__discord').prop('value')).toBe(
      'discordTest',
    );
    expect(wrapper.find('.settings__input-group--webhook__slack').prop('value')).toBe('slackTest');
    wrapper.find('.settings__input-group--button-discord').simulate('keyPress');
    wrapper.find('.settings__input-group--button-slack').simulate('keyPress');
    expect(customProps.onKeyPress).toHaveBeenCalled();
  });

  describe('calls correct handler when editing', () => {
    test('discord field', () => {
      const customProps = {
        onSettingsChange: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const discordInput = wrapper.find('.settings__input-group--webhook__discord');
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
      const slackInput = wrapper.find('.settings__input-group--webhook__slack');
      expect(slackInput.prop('value')).toBe('');
      expect(slackInput.prop('onChange')).toBeDefined();

      slackInput.simulate('change', { target: { value: 'test' } });
      expect(customProps.onSettingsChange).toHaveBeenCalledWith({
        field: SETTINGS_FIELDS.EDIT_SLACK,
        value: 'test',
      });
    });
  });

  describe('calls correct onClick handler when testing webhooks', () => {
    test('discord', () => {
      const customProps = {
        onTestDiscord: jest.fn(),
        discord: 'test',
      };
      const wrapper = renderShallowWithProps(customProps);
      const discordInput = wrapper.find('.settings__input-group--webhook__discord');
      const discordButton = wrapper.find('.settings__input-group--button-discord');
      expect(discordInput.prop('value')).toBe('test');
      expect(discordInput.prop('onChange')).toBeDefined();
      expect(discordButton.prop('onClick')).toBeDefined();

      discordButton.simulate('click');
      expect(customProps.onTestDiscord).toHaveBeenCalledWith('test');
    });

    test('slack', () => {
      const customProps = {
        onTestSlack: jest.fn(),
        slack: 'test',
      };
      const wrapper = renderShallowWithProps(customProps);
      const slackInput = wrapper.find('.settings__input-group--webhook__slack');
      const slackButton = wrapper.find('.settings__input-group--button-slack');
      expect(slackInput.prop('value')).toBe('test');
      expect(slackInput.prop('onChange')).toBeDefined();
      expect(slackButton.prop('onClick')).toBeDefined();

      slackButton.simulate('click');
      expect(customProps.onTestSlack).toHaveBeenCalledWith('test');
    });
  });

  test('map state to props returns the correct structure', () => {
    const state = {
      settings: {
        ...initialSettingsStates.settings,
      },
      discord: initialSettingsStates.settings.discord,
      slack: initialSettingsStates.settings.slack,
      extra: 'fields',
      that: "aren't included",
    };
    const expected = {
      discord: state.discord,
      slack: state.slack,
      errors: state.settings.errors,
    };
    expect(mapStateToProps(state)).toEqual(expected);
  });

  test('map dispatch to props returns the correct structure', () => {
    const dispatch = jest.fn();
    const actual = mapDispatchToProps(dispatch);
    actual.onSettingsChange({
      field: SETTINGS_FIELDS.EDIT_SLACK,
      value: 'test',
    });
    actual.onSettingsChange({
      field: SETTINGS_FIELDS.EDIT_DISCORD,
      value: 'test',
    });
    actual.onTestSlack('test');
    actual.onTestDiscord('test');
    expect(dispatch).toHaveBeenNthCalledWith(
      1,
      settingsActions.edit(SETTINGS_FIELDS.EDIT_SLACK, 'test'),
    );
    expect(dispatch).toHaveBeenNthCalledWith(
      2,
      settingsActions.edit(SETTINGS_FIELDS.EDIT_DISCORD, 'test'),
    );
    expect(dispatch).toHaveBeenNthCalledWith(3, settingsActions.test('test', 'slack'));
    expect(dispatch).toHaveBeenNthCalledWith(4, settingsActions.test('test', 'discord'));
  });
});
