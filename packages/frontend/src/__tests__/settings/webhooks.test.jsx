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
    };
    const wrapper = renderShallowWithProps(customProps);
    expect(wrapper.find('.settings__input-group--webhook__discord')).toHaveLength(1);
    expect(wrapper.find('.settings__input-group--webhook__slack')).toHaveLength(1);
    expect(wrapper.find('.settings__input-group--webhook__discord').prop('value')).toBe(
      'discordTest',
    );
    expect(wrapper.find('.settings__input-group--webhook__slack').prop('value')).toBe('slackTest');
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
    actual.onTestSlack('test');
    expect(dispatch).toHaveBeenNthCalledWith(
      1,
      settingsActions.edit(SETTINGS_FIELDS.EDIT_SLACK, 'test'),
    );
    expect(dispatch).toHaveBeenNthCalledWith(2, settingsActions.test('test', 'slack'));
  });
});
