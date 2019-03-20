/* global describe it expect beforeEach jest test */
import React from 'react';
import { shallow } from 'enzyme';

import { ShippingRatesPrimitive, mapDispatchToProps } from '../../profiles/shippingRates';
import { profileActions } from '../../state/actions';
import { initialProfileStates } from '../../utils/definitions/profileDefinitions';
import { initialState } from '../../state/reducers';

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
      value: initialProfileStates.profile,
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

  test('map dispatch to props returns correct structure', () => {
    const dispatch = jest.fn();
    const tempProfile = {
      ...initialProfileStates.profile,
      id: 1,
      editId: 1,
    };
    const expectedActions = [
      profileActions.load(tempProfile),
      profileActions.remove(1),
      profileActions.select(tempProfile),
    ];
    const actual = mapDispatchToProps(dispatch);
    actual.onChange(tempProfile);
    actual.onDestroyProfile(tempProfile);
    actual.onSelectProfile(tempProfile);

    expect(dispatch).toHaveBeenCalledTimes(3);
    expectedActions.forEach((action, n) => {
      expect(dispatch).toHaveBeenNthCalledWith(
        n + 1,
        typeof action !== 'function' ? action : expect.any(Function),
      );
    });
  });
});
