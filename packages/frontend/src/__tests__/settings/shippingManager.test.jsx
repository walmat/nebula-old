/* global describe it expect beforeEach jest test */
import React from 'react';
import { shallow } from 'enzyme';

import {
  ShippingManagerPrimitive,
  mapStateToProps,
  mapDispatchToProps,
} from '../../settings/shippingManager';
import { SETTINGS_FIELDS, settingsActions } from '../../state/actions';
import { initialState } from '../../state/migrators';
import initialSettingsStates from '../../state/initial/settings';
import initialProfileStates from '../../state/initial/profiles';
import getAllSupportedSitesSorted from '../../constants/getAllSites';

describe('<ShippingManager />', () => {
  let defaultProps;

  const getWrapper = customProps => {
    const renderProps = {
      ...defaultProps,
      ...customProps,
    };
    return shallow(
      <ShippingManagerPrimitive
        theme={renderProps.theme}
        profiles={renderProps.profiles}
        shipping={renderProps.shipping}
        errors={renderProps.errors}
        onSettingsChange={renderProps.onSettingsChange}
        onFetchShippingMethods={renderProps.onFetchShippingMethods}
        onClearShippingFields={renderProps.onClearShippingFields}
        onKeyPress={renderProps.onKeyPress}
      />,
    );
  };

  const renderShallowWithProps = customProps => getWrapper(customProps);

  beforeEach(() => {
    defaultProps = {
      theme: initialState.theme,
      profiles: [
        { ...initialProfileStates.profile, id: 1, profileName: 'profile1' },
        { ...initialProfileStates.profile, id: 2, profileName: 'profile2' },
        { ...initialProfileStates.profile, id: 3, profileName: 'profile3' },
      ],
      shipping: initialSettingsStates.settings.shipping,
      errors: initialSettingsStates.settings.shipping.errors,
      onSettingsChange: () => {},
      onFetchShippingMethods: () => {},
      onClearShippingFields: () => {},
      onKeyPress: () => {},
    };
  });

  it('should render with required props', () => {
    const wrapper = renderShallowWithProps();
    expect(wrapper.find('.settings--shipping-manager__input-group--product')).toHaveLength(1);
    expect(wrapper.find('.settings--shipping-manager__input-group--name')).toHaveLength(1);
    expect(wrapper.find('.settings--shipping-manager__input-group--profile')).toHaveLength(1);
    expect(wrapper.find('.settings--shipping-manager__input-group--site')).toHaveLength(1);
    expect(wrapper.find('.settings--shipping-manager__input-group--username')).toHaveLength(1);
    expect(wrapper.find('.settings--shipping-manager__input-group--password')).toHaveLength(1);
  });

  it('renders with non-default props', () => {
    const customProps = {
      shipping: {
        ...initialSettingsStates.shipping,
        profile: { ...initialProfileStates.profile, id: 1, profileName: 'profile1' },
        name: 'test',
      },
    };
    const wrapper = renderShallowWithProps(customProps);
    expect(wrapper.find('.settings--shipping-manager__input-group--product')).toHaveLength(1);
    expect(wrapper.find('.settings--shipping-manager__input-group--name')).toHaveLength(1);
    expect(wrapper.find('.settings--shipping-manager__input-group--profile')).toHaveLength(1);
    expect(wrapper.find('.settings--shipping-manager__input-group--site')).toHaveLength(1);
    expect(wrapper.find('.settings--shipping-manager__input-group--profile').prop('value')).toEqual(
      {
        value: 1,
        label: 'profile1',
      },
    );
    expect(wrapper.find('.settings--shipping-manager__input-group--name').prop('value')).toEqual(
      'test',
    );
    wrapper.find('.settings--shipping-manager__input-group--fetch').simulate('keyPress');
  });

  describe('calls correct handler when editing', () => {
    test('shipping product', () => {
      const customProps = {
        onSettingsChange: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const productSelector = wrapper.find('.settings--shipping-manager__input-group--product');
      expect(productSelector.prop('value')).toEqual('');
      expect(productSelector.prop('onChange')).toBeDefined();

      productSelector.simulate('change', { target: { value: '+test' } });
      expect(customProps.onSettingsChange).toHaveBeenCalledWith({
        field: SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT,
        value: '+test',
      });
    });

    test('shipping rate name', () => {
      const customProps = {
        onSettingsChange: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const nameSelector = wrapper.find('.settings--shipping-manager__input-group--name');
      expect(nameSelector.prop('value')).toEqual('');
      expect(nameSelector.prop('onChange')).toBeDefined();

      nameSelector.simulate('change', { target: { value: 'test' } });
      expect(customProps.onSettingsChange).toHaveBeenCalledWith({
        field: SETTINGS_FIELDS.EDIT_SHIPPING_RATE_NAME,
        value: 'test',
      });
    });

    test('shipping profile', () => {
      const customProps = {
        onSettingsChange: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const profileSelector = wrapper.find('.settings--shipping-manager__input-group--profile');
      expect(profileSelector.prop('value')).toBeNull();
      expect(profileSelector.prop('onChange')).toBeDefined();
      expect(profileSelector.prop('options')).toEqual([
        { value: 1, label: 'profile1' },
        { value: 2, label: 'profile2' },
        { value: 3, label: 'profile3' },
      ]);

      profileSelector.simulate('change', { value: 1 });
      expect(customProps.onSettingsChange).toHaveBeenCalledWith({
        field: SETTINGS_FIELDS.EDIT_SHIPPING_PROFILE,
        value: defaultProps.profiles[0],
      });

      customProps.onSettingsChange.mockClear();
      profileSelector.simulate('change', { value: 4 });
      expect(customProps.onSettingsChange).toHaveBeenCalledWith({
        field: SETTINGS_FIELDS.EDIT_SHIPPING_PROFILE,
        value: undefined,
      });
    });

    test('shipping site', () => {
      const customProps = {
        onSettingsChange: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const siteSelector = wrapper.find('.settings--shipping-manager__input-group--site');
      expect(siteSelector.prop('value')).toBeNull();
      expect(siteSelector.prop('onChange')).toBeDefined();
      expect(siteSelector.prop('options')).toEqual(getAllSupportedSitesSorted());

      siteSelector.simulate('change', {
        label: 'Nebula Bots',
        value: 'https://nebulabots.com',
        apiKey: '6526a5b5393b6316a64853cfe091841c',
        localCheckout: false,
        special: false,
        auth: false,
      });

      expect(customProps.onSettingsChange).toHaveBeenCalledWith({
        field: SETTINGS_FIELDS.EDIT_SHIPPING_SITE,
        value: {
          name: 'Nebula Bots',
          url: 'https://nebulabots.com',
          apiKey: '6526a5b5393b6316a64853cfe091841c',
          localCheckout: false,
          special: false,
          auth: false,
        },
      });
    });

    test('shipping username', () => {
      const customProps = {
        onSettingsChange: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const usernameSelector = wrapper.find('.settings--shipping-manager__input-group--username');
      expect(usernameSelector.prop('value')).toEqual('');
      expect(usernameSelector.prop('onChange')).toBeDefined();

      usernameSelector.simulate('change', { target: { value: 'test' } });
      expect(customProps.onSettingsChange).toHaveBeenCalledWith({
        field: SETTINGS_FIELDS.EDIT_SHIPPING_USERNAME,
        value: 'test',
      });
    });

    test('shipping password', () => {
      const customProps = {
        onSettingsChange: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const passwordSelector = wrapper.find('.settings--shipping-manager__input-group--password');
      expect(passwordSelector.prop('value')).toEqual('');
      expect(passwordSelector.prop('onChange')).toBeDefined();

      passwordSelector.simulate('change', { target: { value: 'test' } });
      expect(customProps.onSettingsChange).toHaveBeenCalledWith({
        field: SETTINGS_FIELDS.EDIT_SHIPPING_PASSWORD,
        value: 'test',
      });
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
        ...initialSettingsStates,
        shipping: {
          ...initialSettingsStates.shipping,
          product: {
            ...initialSettingsStates.shipping.product,
            raw: '+test',
          },
          name: 'test',
          profile: { ...initialProfileStates.profile, id: 1, profileName: 'profile1' },
          site: {
            name: 'Nebula Bots',
            url: 'https://nebulabots.com',
            apiKey: '6526a5b5393b6316a64853cfe091841c',
            localCheckout: false,
            special: false,
            auth: false,
          },
          username: '',
          password: '',
          errors: {
            ...initialSettingsStates.shippingErrors,
          },
        },
        errors: {
          ...initialSettingsStates.settingsErrors,
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
      shipping: state.settings.shipping,
      errors: state.settings.shipping.errors,
      theme: state.theme,
    };
    expect(mapStateToProps(state)).toEqual(expected);
  });

  test('map dispatch to props should return correct structure', () => {
    const dispatch = jest.fn();
    const expectedAction = settingsActions.edit(SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT, '+data');
    const actual = mapDispatchToProps(dispatch);
    actual.onSettingsChange({
      field: SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT,
      value: '+data',
    });
    expect(dispatch).toHaveBeenCalledWith(expectedAction);
  });
});
