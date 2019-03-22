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
      onChange: () => {},
      onDeleteShippingRate: () => {},
    };
  });

  it('should render with required props', () => {
    const wrapper = renderShallowWithProps();
    expect(wrapper).toBeDefined();
    expect(wrapper.find('.profiles-rates__input-group--site')).toHaveLength(1);
    expect(wrapper.find('.profiles-rates__input-group--name')).toHaveLength(1);
    expect(wrapper.find('.profiles-rates__input-group--rate')).toHaveLength(1);
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
