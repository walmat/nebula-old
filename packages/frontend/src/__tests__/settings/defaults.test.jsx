/* global describe it expect beforeEach afterEach jest test */
import React from 'react';
import { shallow } from 'enzyme';

import { DefaultsPrimitive, mapStateToProps, mapDispatchToProps } from '../../settings/defaults';
import { SETTINGS_FIELDS, settingsActions } from '../../state/actions';
import { initialSettingsStates } from '../../utils/definitions/settingsDefinitions';
import { initialProfileStates } from '../../utils/definitions/profileDefinitions';
import { initialState } from '../../state/reducers';
import getAllSizes from '../../constants/getAllSizes';

describe('<Defaults />', () => {
  let defaultProps;

  const renderShallowWithProps = customProps => {
    const renderProps = {
      ...defaultProps,
      ...customProps,
    };
    return shallow(
      <DefaultsPrimitive
        onSettingsChange={renderProps.onSettingsChange}
        onSaveDefaults={renderProps.onSaveDefaults}
        onClearDefaults={renderProps.onClearDefaults}
        profiles={renderProps.profiles}
        settings={renderProps.settings}
        onKeyPress={renderProps.onKeyPress}
        theme={renderProps.theme}
        errors={renderProps.errors}
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
        ...initialSettingsStates.settingsErrors.defaults,
      },
      theme: {
        ...initialState.theme,
      },
      onSettingsChange: () => {},
      onSaveDefaults: () => {},
      onClearDefaults: () => {},
      onKeyPress: () => {},
    };
  });

  it('renders with required props', () => {
    const wrapper = renderShallowWithProps();
    expect(wrapper.find('.settings-defaults__input-group--select__profile')).toHaveLength(1);
    expect(wrapper.find('.settings-defaults__input-group--select__sizes')).toHaveLength(1);
    expect(wrapper.find('.settings-defaults__input-group--save')).toHaveLength(1);
    expect(wrapper.find('.settings-defaults__input-group--clear')).toHaveLength(1);
  });

  it('renders with non-default props', () => {
    const customProps = {
      settings: {
        ...initialSettingsStates.settings,
        defaults: {
          profile: { ...initialProfileStates.profile, id: 1, profileName: 'profile1' },
          sizes: ['4', '4.5', '5'],
        },
      },
    };
    const wrapper = renderShallowWithProps(customProps);
    expect(wrapper.find('.settings-defaults__input-group--select__profile')).toHaveLength(1);
    expect(wrapper.find('.settings-defaults__input-group--select__sizes')).toHaveLength(1);
    expect(wrapper.find('.settings-defaults__input-group--save')).toHaveLength(1);
    expect(wrapper.find('.settings-defaults__input-group--clear')).toHaveLength(1);
    expect(wrapper.find('.settings-defaults__input-group--select__profile').prop('value')).toEqual({
      value: 1,
      label: 'profile1',
    });
    expect(wrapper.find('.settings-defaults__input-group--select__sizes').prop('value')).toEqual([
      { value: '4', label: '4' },
      { value: '4.5', label: '4.5' },
      { value: '5', label: '5' },
    ]);
    wrapper.find('.settings-defaults__input-group--save').simulate('keyPress');
  });

  describe('calls correct handler when editing', () => {
    test('default profile', () => {
      const customProps = {
        onSettingsChange: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const profileSelector = wrapper.find('.settings-defaults__input-group--select__profile');
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
      const sizeSelector = wrapper.find('.settings-defaults__input-group--select__sizes');
      expect(sizeSelector.prop('value')).toEqual([]);
      expect(sizeSelector.prop('onChange')).toBeDefined();
      expect(sizeSelector.prop('options')).toEqual(getAllSizes());

      sizeSelector.simulate('change', [{ value: '4', label: '4.0' }]);
      expect(customProps.onSettingsChange).toHaveBeenCalledWith({
        field: SETTINGS_FIELDS.EDIT_DEFAULT_SIZES,
        value: ['4'],
      });

      customProps.onSettingsChange.mockClear();
      sizeSelector.simulate('change', [
        { value: '4', label: '4.0' },
        { value: '4.5', label: '4.5' },
        { value: '5', label: '5.0' },
      ]);
      expect(customProps.onSettingsChange).toHaveBeenCalledWith({
        field: SETTINGS_FIELDS.EDIT_DEFAULT_SIZES,
        value: ['4', '4.5', '5'],
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
      const saveButton = wrapper.find('.settings-defaults__input-group--save');
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
      const clearButton = wrapper.find('.settings-defaults__input-group--clear');
      clearButton.simulate('keyPress');
      expect(customProps.onKeyPress).toHaveBeenCalled();
      clearButton.simulate('click');
      expect(customProps.onClearDefaults).toHaveBeenCalledWith(SETTINGS_FIELDS.CLEAR_DEFAULTS);
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
      },
      theme: {
        ...initialState.theme,
      },
      extra: 'fields',
      that: "aren't included",
    };
    const expected = {
      profiles: state.profiles,
      settings: state.settings,
      errors: state.settings.errors,
      theme: state.theme,
    };
    expect(mapStateToProps(state)).toEqual(expected);
  });

  test('map dispatch to props returns the correct structure', () => {
    const dispatch = jest.fn();
    const actual = mapDispatchToProps(dispatch);
    actual.onSettingsChange({
      field: SETTINGS_FIELDS.EDIT_DEFAULT_PROFILE,
      value: { ...initialProfileStates.profile, id: 1, profileName: 'profile1' },
    });
    actual.onSaveDefaults({
      profile: {},
      sizes: [],
    });
    actual.onClearDefaults(SETTINGS_FIELDS.CLEAR_DEFAULTS);
    expect(dispatch).toHaveBeenNthCalledWith(
      1,
      settingsActions.edit(SETTINGS_FIELDS.EDIT_DEFAULT_PROFILE, {
        ...initialProfileStates.profile,
        id: 1,
        profileName: 'profile1',
      }),
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
