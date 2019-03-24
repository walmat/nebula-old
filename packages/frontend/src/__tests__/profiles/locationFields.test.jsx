/* global describe it expect beforeEach jest test */
import React from 'react';
import { shallow } from 'enzyme';

import {
  LocationFieldsPrimitive,
  mapStateToProps,
  mapDispatchToProps,
} from '../../profiles/locationFields';
import { PROFILE_FIELDS, LOCATION_FIELDS, profileActions } from '../../state/actions';
import initialProfileStates from '../../state/initial/profiles';

describe('<LocationFields />', () => {
  it('should render with required props', () => {
    const wrapper = shallow(
      <LocationFieldsPrimitive
        errors={{ ...initialProfileStates.locationErrors }}
        onChange={() => {}}
        disabled={false}
        id="test"
        value={{ ...initialProfileStates.location }}
      />,
    );
    expect(wrapper.find('.test-profiles-location__input-group--first-name')).toHaveLength(1);
    expect(wrapper.find('.test-profiles-location__input-group--last-name')).toHaveLength(1);
    expect(wrapper.find('.test-profiles-location__input-group--address-one')).toHaveLength(1);
    expect(wrapper.find('.test-profiles-location__input-group--address-two')).toHaveLength(1);
    expect(wrapper.find('.test-profiles-location__input-group--city')).toHaveLength(1);
    expect(wrapper.find('.test-profiles-location__input-group--province')).toHaveLength(1);
    expect(wrapper.find('.test-profiles-location__input-group--zip-code')).toHaveLength(1);
    expect(wrapper.find('.test-profiles-location__input-group--country')).toHaveLength(1);
    expect(wrapper.find('.test-profiles-location__input-group--phone')).toHaveLength(1);
    expect(
      wrapper.find('.test-profiles-location__input-group--first-name').prop('disabled'),
    ).toBeFalsy();
    expect(
      wrapper.find('.test-profiles-location__input-group--last-name').prop('disabled'),
    ).toBeFalsy();
    expect(
      wrapper.find('.test-profiles-location__input-group--address-one').prop('disabled'),
    ).toBeFalsy();
    expect(
      wrapper.find('.test-profiles-location__input-group--address-two').prop('disabled'),
    ).toBeFalsy();
    expect(wrapper.find('.test-profiles-location__input-group--city').prop('disabled')).toBeFalsy();
    expect(
      wrapper.find('.test-profiles-location__input-group--province').prop('isDisabled'),
    ).toBeFalsy();
    expect(
      wrapper.find('.test-profiles-location__input-group--zip-code').prop('disabled'),
    ).toBeFalsy();
    expect(
      wrapper.find('.test-profiles-location__input-group--country').prop('isDisabled'),
    ).toBeFalsy();
    expect(
      wrapper.find('.test-profiles-location__input-group--phone').prop('disabled'),
    ).toBeFalsy();
  });

  it('should render with disabled styling', () => {
    const wrapper = shallow(
      <LocationFieldsPrimitive
        errors={{ ...initialProfileStates.locationErrors }}
        onChange={() => {}}
        disabled
        id="test"
        value={{ ...initialProfileStates.location }}
      />,
    );
    expect(
      wrapper.find('.test-profiles-location__input-group--first-name').prop('disabled'),
    ).toBeTruthy();
    expect(
      wrapper.find('.test-profiles-location__input-group--last-name').prop('disabled'),
    ).toBeTruthy();
    expect(
      wrapper.find('.test-profiles-location__input-group--address-one').prop('disabled'),
    ).toBeTruthy();
    expect(
      wrapper.find('.test-profiles-location__input-group--address-two').prop('disabled'),
    ).toBeTruthy();
    expect(
      wrapper.find('.test-profiles-location__input-group--city').prop('disabled'),
    ).toBeTruthy();
    expect(
      wrapper.find('.test-profiles-location__input-group--province').prop('isDisabled'),
    ).toBeTruthy();
    expect(
      wrapper.find('.test-profiles-location__input-group--zip-code').prop('disabled'),
    ).toBeTruthy();
    expect(
      wrapper.find('.test-profiles-location__input-group--country').prop('isDisabled'),
    ).toBeTruthy();
    expect(
      wrapper.find('.test-profiles-location__input-group--phone').prop('disabled'),
    ).toBeTruthy();
  });

  it('should render shipping row with billing matches shipping button not clicked', () => {
    const wrapper = shallow(
      <LocationFieldsPrimitive
        errors={{ ...initialProfileStates.locationErrors }}
        onChange={() => {}}
        disabled
        id="shipping"
        value={{ ...initialProfileStates.location }}
        currentProfile={{ ...initialProfileStates.profile }}
      />,
    );

    expect(
      wrapper.find('.shipping-profiles-location__input-group--first-name').prop('disabled'),
    ).toBeTruthy();
    expect(
      wrapper.find('.shipping-profiles-location__input-group--last-name').prop('disabled'),
    ).toBeTruthy();
    expect(
      wrapper.find('.shipping-profiles-location__input-group--address-one').prop('disabled'),
    ).toBeTruthy();
    expect(
      wrapper.find('.shipping-profiles-location__input-group--address-two').prop('disabled'),
    ).toBeTruthy();
    expect(
      wrapper.find('.shipping-profiles-location__input-group--city').prop('disabled'),
    ).toBeTruthy();
    expect(
      wrapper.find('.shipping-profiles-location__input-group--province').prop('isDisabled'),
    ).toBeTruthy();
    expect(
      wrapper.find('.shipping-profiles-location__input-group--zip-code').prop('disabled'),
    ).toBeTruthy();
    expect(
      wrapper.find('.shipping-profiles-location__input-group--country').prop('isDisabled'),
    ).toBeTruthy();
    expect(
      wrapper.find('.shipping-profiles-location__input-group--phone').prop('disabled'),
    ).toBeTruthy();
    expect(wrapper.find('.profiles__fields--matches')).toHaveLength(1);
    expect(wrapper.find('.profiles__fields--matches').prop('title')).toEqual(
      "Billing Doesn't Match Shipping",
    );
  });

  it('should render shipping row with billing matches shipping button not clicked', () => {
    const wrapper = shallow(
      <LocationFieldsPrimitive
        errors={{ ...initialProfileStates.locationErrors }}
        onChange={() => {}}
        onClickBillingMatchesShipping={() => {}}
        disabled
        id="shipping"
        value={{ ...initialProfileStates.location }}
        currentProfile={{ ...initialProfileStates.profile, billingMatchesShipping: true }}
      />,
    );

    expect(
      wrapper.find('.shipping-profiles-location__input-group--first-name').prop('disabled'),
    ).toBeTruthy();
    expect(
      wrapper.find('.shipping-profiles-location__input-group--last-name').prop('disabled'),
    ).toBeTruthy();
    expect(
      wrapper.find('.shipping-profiles-location__input-group--address-one').prop('disabled'),
    ).toBeTruthy();
    expect(
      wrapper.find('.shipping-profiles-location__input-group--address-two').prop('disabled'),
    ).toBeTruthy();
    expect(
      wrapper.find('.shipping-profiles-location__input-group--city').prop('disabled'),
    ).toBeTruthy();
    expect(
      wrapper.find('.shipping-profiles-location__input-group--province').prop('isDisabled'),
    ).toBeTruthy();
    expect(
      wrapper.find('.shipping-profiles-location__input-group--zip-code').prop('disabled'),
    ).toBeTruthy();
    expect(
      wrapper.find('.shipping-profiles-location__input-group--country').prop('isDisabled'),
    ).toBeTruthy();
    expect(
      wrapper.find('.shipping-profiles-location__input-group--phone').prop('disabled'),
    ).toBeTruthy();
    const BMS = wrapper.find('.profiles__fields--matches');
    expect(BMS).toHaveLength(1);
    expect(BMS.prop('title')).toEqual('Billing Matches Shipping');
    BMS.simulate('click');
    const expectedAction = profileActions.edit(
      null,
      PROFILE_FIELDS.TOGGLE_BILLING_MATCHES_SHIPPING,
      '',
    );
    const dispatch = jest.fn();
    const actual = mapDispatchToProps(dispatch, {});
    expect(actual.onClickBillingMatchesShipping).toBeDefined();
    actual.onClickBillingMatchesShipping();
    expect(dispatch).toHaveBeenCalledWith(expectedAction);
  });

  it('should render no province options for countries that have none', () => {
    const wrapper = shallow(
      <LocationFieldsPrimitive
        errors={{ ...initialProfileStates.locationErrors }}
        onChange={() => {}}
        disabled
        id="test"
        value={{ ...initialProfileStates.location, country: null }}
      />,
    );

    expect(
      wrapper.find('.test-profiles-location__input-group--province').prop('isDisabled'),
    ).toBeTruthy();
    expect(wrapper.find('.test-profiles-location__input-group--province').prop('options')).toEqual(
      undefined,
    );
  });

  describe('should render correct values for', () => {
    const testFieldValue = (id, field, value1, value2, disabled) => {
      const input = {
        ...initialProfileStates.location,
        [field]: value1,
      };
      const wrapper = shallow(
        <LocationFieldsPrimitive
          id="test"
          value={input}
          onChange={() => {}}
          errors={input.errors}
          disabled={disabled}
        />,
      );
      let inputField = wrapper.find(`.test-profiles-location__input-group--${id}`);
      expect(inputField.prop('value')).toEqual(value1);
      input[field] = value2;
      wrapper.setProps({
        ...wrapper.props(),
        value: input,
      });
      inputField = wrapper.find(`.test-profiles-location__input-group--${id}`);
      expect(inputField.prop('value')).toEqual(value2);
    };

    const testField = (id, field, value1, value2) => {
      test('when enabled', () => {
        testFieldValue(id, field, value1, value2, false);
      });

      test('when disabled', () => {
        testFieldValue(id, field, value1, value2, true);
      });
    };

    describe('first name', () => {
      testField('first-name', 'firstName', 'testFirstName1', 'testFirstName2');
    });

    describe('last name', () => {
      testField('last-name', 'lastName', 'testLastName1', 'testLastName2');
    });

    describe('address', () => {
      testField('address-one', 'address', 'testAddress1', 'testAddress2');
    });

    describe('apt', () => {
      testField('address-two', 'apt', 'testApt1', 'testApt2');
    });

    describe('city', () => {
      testField('city', 'city', 'testCity1', 'testCity2');
    });

    describe('province', () => {
      testField(
        'province',
        'province',
        {
          value: 'AL',
          label: 'Alabama',
        },
        {
          value: 'AL',
          label: 'Alabama',
        },
      );
    });

    describe('zip code', () => {
      testField('zip-code', 'zipCode', 'testZip1', 'testZip2');
    });

    describe('country', () => {
      testField(
        'country',
        'country',
        { value: 'AF', label: 'Afghanistan' },
        { value: 'AF', label: 'Afghanistan' },
      );
    });

    describe('phone  number', () => {
      testField('phone', 'phone', 'testPhone1', 'testPhone2');
    });
  });

  describe('should call onChange handler when editing', () => {
    const testOnChange = (id, event, expectedCall) => {
      const input = { ...initialProfileStates.location };
      const onChangeHandler = jest.fn();
      const wrapper = shallow(
        <LocationFieldsPrimitive
          id="test"
          value={input}
          onChange={onChangeHandler}
          errors={input.errors}
          disabled={false}
        />,
      );
      const inputField = wrapper.find(`.test-profiles-location__input-group--${id}`);
      inputField.simulate('change', event);
      expect(onChangeHandler).toHaveBeenCalledWith(expectedCall);
    };

    test('first name', () => {
      testOnChange(
        'first-name',
        { target: { value: 'testFirstName' } },
        { field: LOCATION_FIELDS.FIRST_NAME, value: 'testFirstName' },
      );
    });

    test('last name', () => {
      testOnChange(
        'last-name',
        { target: { value: 'testLastName' } },
        { field: LOCATION_FIELDS.LAST_NAME, value: 'testLastName' },
      );
    });

    test('address', () => {
      testOnChange(
        'address-one',
        { target: { value: 'testAddress' } },
        { field: LOCATION_FIELDS.ADDRESS, value: 'testAddress' },
      );
    });

    test('apt', () => {
      testOnChange(
        'address-two',
        { target: { value: 'testApt' } },
        { field: LOCATION_FIELDS.APT, value: 'testApt' },
      );
    });

    test('city', () => {
      testOnChange(
        'city',
        { target: { value: 'testCity' } },
        { field: LOCATION_FIELDS.CITY, value: 'testCity' },
      );
    });

    test('province', () => {
      const event = {
        value: 'AL',
        label: 'Alabama',
      };
      testOnChange('province', event, {
        field: LOCATION_FIELDS.PROVINCE,
        value: {
          country: initialProfileStates.location.country,
          province: event,
        },
      });
    });

    test('zip code', () => {
      testOnChange(
        'zip-code',
        { target: { value: 'testZipCode' } },
        { field: LOCATION_FIELDS.ZIP_CODE, value: 'testZipCode' },
      );
    });

    test('country', () => {
      const event = { value: 'US', label: 'United States' };
      testOnChange('country', event, { field: LOCATION_FIELDS.COUNTRY, value: event });
    });

    test('phone number', () => {
      testOnChange(
        'phone',
        { target: { value: 'testPhoneNumber' } },
        { field: LOCATION_FIELDS.PHONE_NUMBER, value: 'testPhoneNumber' },
      );
    });
  });

  test('map state to props returns the correct structure', () => {
    const profile = {
      ...initialProfileStates.profile,
      billing: {
        ...initialProfileStates.location,
        firstName: 'billing',
      },
      shipping: {
        ...initialProfileStates.location,
        firstName: 'shipping',
      },
    };
    const ownProps = {
      id: 'test',
      disabled: true,
      profileToEdit: profile,
      fieldToEdit: PROFILE_FIELDS.EDIT_BILLING,
    };
    let actual = mapStateToProps({}, ownProps);
    expect(actual.id).toBe(ownProps.id);
    expect(actual.disabled).toBeTruthy();
    expect(actual.value).toEqual(ownProps.profileToEdit.billing);
    expect(actual.errors).toEqual(ownProps.profileToEdit.billing.errors);

    ownProps.fieldToEdit = PROFILE_FIELDS.EDIT_SHIPPING;
    ownProps.disabled = false;
    ownProps.id = 'test2';
    actual = mapStateToProps({}, ownProps);
    expect(actual.id).toBe(ownProps.id);
    expect(actual.disabled).toBeFalsy();
    expect(actual.value).toEqual(ownProps.profileToEdit.shipping);
    expect(actual.errors).toEqual(ownProps.profileToEdit.shipping.errors);
  });

  test('map dispatch to props returns the correct structure', () => {
    const profile = {
      ...initialProfileStates.profile,
      id: 'test',
    };
    const ownProps = {
      fieldToEdit: PROFILE_FIELDS.EDIT_BILLING,
      profileToEdit: profile,
    };
    const changes = {
      field: LOCATION_FIELDS.FIRST_NAME,
      value: 'test',
    };
    const expectedAction = profileActions.edit(
      profile.id,
      PROFILE_FIELDS.EDIT_BILLING,
      changes.value,
      changes.field,
    );
    const dispatch = jest.fn();
    const actual = mapDispatchToProps(dispatch, ownProps);
    expect(actual.onChange).toBeDefined();
    actual.onChange(changes);
    expect(dispatch).toHaveBeenCalledWith(expectedAction);
  });
});
