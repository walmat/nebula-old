/* global describe it expect beforeEach jest test */
import React from 'react';
import { shallow } from 'enzyme';

import {
  ShippingRatesPrimitive,
  mapStateToProps,
  mapDispatchToProps,
} from '../../profiles/shippingRates';
import { profileActions, PROFILE_FIELDS } from '../../state/actions';
import initialProfileStates from '../../state/initial/profiles';
import { initialState } from '../../state/migrators';
import { RATES_FIELDS } from '../../state/actions/profiles/profileActions';

describe('<ShippingRates />', () => {
  let defaultProps;

  const renderShallowWithProps = customProps => {
    const renderProps = {
      ...defaultProps,
      ...customProps,
    };
    return shallow(
      <ShippingRatesPrimitive
        theme={renderProps.theme}
        value={renderProps.value}
        onChange={renderProps.onChange}
        onDeleteShippingRate={renderProps.onDeleteShippingRate}
      />,
    );
  };

  beforeEach(() => {
    defaultProps = {
      theme: initialState.theme,
      value: {
        ...initialProfileStates.profile,
        rates: [...initialProfileStates.rates],
      },
      onChange: () => {},
      onDeleteShippingRate: () => {},
    };
  });

  it('should render with required props', () => {
    const wrapper = renderShallowWithProps();
    expect(wrapper).toBeDefined();
    expect(wrapper.find('.profiles-rates__input-group--site')).toHaveLength(0);
    expect(wrapper.find('.profiles-rates__input-group--name')).toHaveLength(0);
    expect(wrapper.find('.profiles-rates__input-group--rate')).toHaveLength(0);
    expect(wrapper.find('.profiles-rates__input-group--delete')).toHaveLength(0);
  });

  it('should render with custom props', () => {
    const customProps = {
      value: {
        ...initialProfileStates.profile,
        rates: [
          ...initialProfileStates.rates,
          {
            site: {
              name: 'Kith',
              url: 'https://kith.com',
            },
            rates: [
              {
                name: '5-7 Business Days',
                rate: 'shopify-UPS%20GROUND%20(5-7%20business%20days)-10.00',
              },
            ],
            selectedRate: null,
          },
        ],
      },
    };
    const wrapper = renderShallowWithProps(customProps);
    expect(wrapper).toBeDefined();
    expect(wrapper.find('.profiles-rates__input-group--rate')).toHaveLength(1);
    expect(wrapper.find('.profiles-rates__input-group--site')).toHaveLength(1);
    expect(wrapper.find('.profiles-rates__input-group--name')).toHaveLength(1);
    expect(wrapper.find('.profiles-rates__input-group--delete')).toHaveLength(1);
  });

  describe('should render rate fields', () => {
    test('when no selectedSite is chosen', () => {
      const customProps = {
        value: {
          ...initialProfileStates.profile,
          selectedSite: null,
          rates: [
            ...initialProfileStates.rates,
            {
              site: {
                name: 'Kith',
                url: 'https://kith.com',
              },
              rates: [
                {
                  name: '5-7 Business Days',
                  rate: 'shopify-UPS%20GROUND%20(5-7%20business%20days)-10.00',
                },
              ],
              selectedRate: null,
            },
          ],
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      expect(wrapper).toBeDefined();
      const rate = wrapper.find('.profiles-rates__input-group--rate');
      const site = wrapper.find('.profiles-rates__input-group--site');
      const name = wrapper.find('.profiles-rates__input-group--name');
      const deleteButton = wrapper.find('.profiles-rates__input-group--delete');

      expect(rate).toHaveLength(1);
      expect(site).toHaveLength(1);
      expect(name).toHaveLength(1);
      expect(deleteButton).toHaveLength(1);
      expect(site.prop('value')).toBe(null);
      expect(name.prop('value')).toBe(null);
      expect(rate.prop('value')).toBe('');
    });

    test('when selectedSite is chosen and no rate has been chosen', () => {
      const customProps = {
        value: {
          ...initialProfileStates.profile,
          selectedSite: {
            label: 'Kith',
            value: 'https://kith.com',
          },
          rates: [
            ...initialProfileStates.rates,
            {
              site: {
                name: 'Kith',
                url: 'https://kith.com',
              },
              rates: [
                {
                  name: '5-7 Business Days',
                  rate: 'shopify-UPS%20GROUND%20(5-7%20business%20days)-10.00',
                },
              ],
              selectedRate: null,
            },
          ],
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      expect(wrapper).toBeDefined();
      const rate = wrapper.find('.profiles-rates__input-group--rate');
      const site = wrapper.find('.profiles-rates__input-group--site');
      const name = wrapper.find('.profiles-rates__input-group--name');
      const deleteButton = wrapper.find('.profiles-rates__input-group--delete');

      expect(rate).toHaveLength(1);
      expect(site).toHaveLength(1);
      expect(name).toHaveLength(1);
      expect(deleteButton).toHaveLength(1);
      expect(site.prop('value')).toEqual({
        label: 'Kith',
        value: 'https://kith.com',
      });
      expect(name.prop('value')).toBe(null);
      expect(rate.prop('value')).toBe('');
    });

    test('when both selectedSite and selectedRate are chosen', () => {
      const customProps = {
        value: {
          ...initialProfileStates.profile,
          selectedSite: {
            label: 'Kith',
            value: 'https://kith.com',
          },
          rates: [
            ...initialProfileStates.rates,
            {
              site: {
                name: 'Kith',
                url: 'https://kith.com',
              },
              rates: [
                {
                  name: '5-7 Business Days',
                  rate: 'shopify-UPS%20GROUND%20(5-7%20business%20days)-10.00',
                },
              ],
              selectedRate: {
                label: '5-7 Business Days',
                value: 'shopify-UPS%20GROUND%20(5-7%20business%20days)-10.00',
              },
            },
          ],
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      expect(wrapper).toBeDefined();
      const rate = wrapper.find('.profiles-rates__input-group--rate');
      const site = wrapper.find('.profiles-rates__input-group--site');
      const name = wrapper.find('.profiles-rates__input-group--name');
      const deleteButton = wrapper.find('.profiles-rates__input-group--delete');

      expect(rate).toHaveLength(1);
      expect(site).toHaveLength(1);
      expect(name).toHaveLength(1);
      expect(deleteButton).toHaveLength(1);
      expect(site.prop('value')).toEqual({
        label: 'Kith',
        value: 'https://kith.com',
      });
      expect(name.prop('value')).toEqual({
        label: '5-7 Business Days',
        value: 'shopify-UPS%20GROUND%20(5-7%20business%20days)-10.00',
      });
      expect(rate.prop('value')).toEqual('shopify-UPS%20GROUND%20(5-7%20business%20days)-10.00');
    });
  });

  describe('should call correct event handler when', () => {
    test('selecting site', () => {
      const customProps = {
        value: {
          ...initialProfileStates.profile,
          selectedSite: null,
          rates: [
            ...initialProfileStates.rates,
            {
              site: {
                name: 'Kith',
                url: 'https://kith.com',
              },
              rates: [
                {
                  name: '5-7 Business Days',
                  rate: 'shopify-UPS%20GROUND%20(5-7%20business%20days)-10.00',
                },
              ],
              selectedRate: {
                label: '5-7 Business Days',
                value: 'shopify-UPS%20GROUND%20(5-7%20business%20days)-10.00',
              },
            },
          ],
        },
        onChange: jest.fn(),
      };

      const wrapper = renderShallowWithProps(customProps);
      const site = wrapper.find('.profiles-rates__input-group--site');
      site.simulate('change', {
        name: 'Kith',
        url: 'https://kith.com',
      });
      expect(customProps.onChange).toHaveBeenCalledWith(
        {
          field: RATES_FIELDS.SITE,
          value: {
            name: 'Kith',
            url: 'https://kith.com',
          },
        },
        PROFILE_FIELDS.EDIT_SELECTED_SITE,
      );
    });

    test('default', () => {
      const customProps = {
        value: {
          ...initialProfileStates.profile,
          selectedSite: {
            label: 'Kith',
            value: 'https://kith.com',
          },
          rates: [
            ...initialProfileStates.rates,
            {
              site: {
                name: 'Kith',
                url: 'https://kith.com',
              },
              rates: [
                {
                  name: '5-7 Business Days',
                  rate: 'shopify-UPS%20GROUND%20(5-7%20business%20days)-10.00',
                },
              ],
              selectedRate: {
                label: '5-7 Business Days',
                value: 'shopify-UPS%20GROUND%20(5-7%20business%20days)-10.00',
              },
            },
          ],
        },
        onChange: jest.fn(),
      };

      const wrapper = renderShallowWithProps(customProps);
      const name = wrapper.find('.profiles-rates__input-group--name');
      name.simulate('change', {
        label: '5-7 Business Days',
        value: 'shopify-UPS%20GROUND%20(5-7%20business%20days)-10.00',
      });
      expect(customProps.onChange).toHaveBeenCalledWith(
        {
          field: RATES_FIELDS.RATE,
          value: {
            site: {
              label: 'Kith',
              value: 'https://kith.com',
            },
            rate: {
              label: '5-7 Business Days',
              value: 'shopify-UPS%20GROUND%20(5-7%20business%20days)-10.00',
            },
          },
        },
        PROFILE_FIELDS.EDIT_RATES,
      );
    });

    test('deleting when there is no selectedSite', () => {
      const customProps = {
        value: {
          ...initialProfileStates.profile,
          selectedSite: null,
          rates: [
            ...initialProfileStates.rates,
            {
              site: {
                name: 'Kith',
                url: 'https://kith.com',
              },
              rates: [
                {
                  name: '5-7 Business Days',
                  rate: 'shopify-UPS%20GROUND%20(5-7%20business%20days)-10.00',
                },
              ],
              selectedRate: null,
            },
          ],
        },
        onDeleteShippingRate: jest.fn(),
      };

      const wrapper = renderShallowWithProps(customProps);
      const deleteButton = wrapper.find('.profiles-rates__input-group--delete');
      deleteButton.simulate('click');
      expect(customProps.onDeleteShippingRate).not.toHaveBeenCalled();
    });

    test('deleting when there is a selected rate', () => {
      const customProps = {
        value: {
          ...initialProfileStates.profile,
          selectedSite: {
            label: 'Kith',
            value: 'https://kith.com',
          },
          rates: [
            ...initialProfileStates.rates,
            {
              site: {
                name: 'Kith',
                url: 'https://kith.com',
              },
              rates: [
                {
                  name: '5-7 Business Days',
                  rate: 'shopify-UPS%20GROUND%20(5-7%20business%20days)-10.00',
                },
              ],
              selectedRate: {
                label: '5-7 Business Days',
                value: 'shopify-UPS%20GROUND%20(5-7%20business%20days)-10.00',
              },
            },
          ],
        },
        onDeleteShippingRate: jest.fn(),
      };

      const wrapper = renderShallowWithProps(customProps);
      const deleteButton = wrapper.find('.profiles-rates__input-group--delete');
      deleteButton.simulate('click');
      expect(customProps.onDeleteShippingRate).toHaveBeenCalledWith(
        {
          label: 'Kith',
          value: 'https://kith.com',
        },
        {
          label: '5-7 Business Days',
          value: 'shopify-UPS%20GROUND%20(5-7%20business%20days)-10.00',
        },
      );
    });

    test('deleting when there is not a selected rate', () => {
      const customProps = {
        value: {
          ...initialProfileStates.profile,
          selectedSite: {
            label: 'Kith',
            value: 'https://kith.com',
          },
          rates: [
            ...initialProfileStates.rates,
            {
              site: {
                name: 'Kith',
                url: 'https://kith.com',
              },
              rates: [
                {
                  name: '5-7 Business Days',
                  rate: 'shopify-UPS%20GROUND%20(5-7%20business%20days)-10.00',
                },
              ],
              selectedRate: null,
            },
          ],
        },
        onDeleteShippingRate: jest.fn(),
      };

      const wrapper = renderShallowWithProps(customProps);
      const deleteButton = wrapper.find('.profiles-rates__input-group--delete');
      deleteButton.simulate('click');
      expect(customProps.onDeleteShippingRate).not.toHaveBeenCalled();
    });
  });

  test('map state to props returns correct structure', () => {
    const profile = {
      ...initialProfileStates.profile,
      payment: {
        ...initialProfileStates.payment,
        email: 'test@email.com',
      },
    };
    const actual = mapStateToProps(initialState, { profileToEdit: profile });
    expect(actual.value).toEqual(profile);
    expect(actual.theme).toEqual(initialState.theme);
  });

  test('map dispatch to props returns correct structure', () => {
    const dispatch = jest.fn();
    const tempProfile = {
      ...initialProfileStates.profile,
      id: 1,
      editId: 1,
    };
    const expectedActions = [
      profileActions.edit(
        tempProfile.id,
        PROFILE_FIELDS.EDIT_SELECTED_SITE,
        {
          value: 'shopify-UPS%20GROUND%20(5-7%20business%20days)-10.00',
          label: '5-7 Business Days',
        },
        RATES_FIELDS.SITE,
      ),
      profileActions.deleteRate(
        {
          label: 'Kith',
          value: 'https://kith.com',
          apiKey: '08430b96c47dd2ac8e17e305db3b71e8',
          auth: false,
          supported: true,
        },
        {
          value: 'shopify-UPS%20GROUND%20(5-7%20business%20days)-10.00',
          label: '5-7 Business Days',
        },
      ),
    ];
    const actual = mapDispatchToProps(dispatch, {
      profileToEdit: {
        ...initialProfileStates.profile,
        id: 1,
        editId: 1,
      },
    });
    actual.onChange(
      {
        field: RATES_FIELDS.SITE,
        value: {
          value: 'shopify-UPS%20GROUND%20(5-7%20business%20days)-10.00',
          label: '5-7 Business Days',
        },
      },
      PROFILE_FIELDS.EDIT_SELECTED_SITE,
    );
    actual.onDeleteShippingRate(
      {
        label: 'Kith',
        value: 'https://kith.com',
        apiKey: '08430b96c47dd2ac8e17e305db3b71e8',
        auth: false,
        supported: true,
      },
      {
        value: 'shopify-UPS%20GROUND%20(5-7%20business%20days)-10.00',
        label: '5-7 Business Days',
      },
    );

    expect(dispatch).toHaveBeenCalledTimes(2);
    expectedActions.forEach((action, n) => {
      expect(dispatch).toHaveBeenNthCalledWith(
        n + 1,
        typeof action !== 'function' ? action : expect.any(Function),
      );
    });
  });
});
