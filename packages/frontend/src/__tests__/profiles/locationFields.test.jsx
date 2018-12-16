/* global describe it expect beforeEach jest test */
import React from 'react';
import { shallow } from 'enzyme';

import {
  LocationFieldsPrimitive,
  mapStateToProps,
  mapDispatchToProps,
} from '../../profiles/locationFields';
import { PROFILE_FIELDS, LOCATION_FIELDS, profileActions } from '../../state/actions';
import { initialProfileStates } from '../../utils/definitions/profileDefinitions';

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
    expect(wrapper.find('#test-first-name')).toHaveLength(1);
    expect(wrapper.find('#test-last-name')).toHaveLength(1);
    expect(wrapper.find('#test-address-one')).toHaveLength(1);
    expect(wrapper.find('#test-address-two')).toHaveLength(1);
    expect(wrapper.find('#test-city')).toHaveLength(1);
    expect(wrapper.find('#test-state')).toHaveLength(1);
    expect(wrapper.find('#test-zip-code')).toHaveLength(1);
    expect(wrapper.find('#test-country')).toHaveLength(1);
    expect(wrapper.find('#test-phone')).toHaveLength(1);
    expect(wrapper.find('#test-first-name').prop('disabled')).toBeFalsy();
    expect(wrapper.find('#test-last-name').prop('disabled')).toBeFalsy();
    expect(wrapper.find('#test-address-one').prop('disabled')).toBeFalsy();
    expect(wrapper.find('#test-address-two').prop('disabled')).toBeFalsy();
    expect(wrapper.find('#test-city').prop('disabled')).toBeFalsy();
    expect(wrapper.find('#test-state').prop('isDisabled')).toBeFalsy();
    expect(wrapper.find('#test-zip-code').prop('disabled')).toBeFalsy();
    expect(wrapper.find('#test-country').prop('isDisabled')).toBeFalsy();
    expect(wrapper.find('#test-phone').prop('disabled')).toBeFalsy();
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
    expect(wrapper.find('#test-first-name').prop('disabled')).toBeTruthy();
    expect(wrapper.find('#test-last-name').prop('disabled')).toBeTruthy();
    expect(wrapper.find('#test-address-one').prop('disabled')).toBeTruthy();
    expect(wrapper.find('#test-address-two').prop('disabled')).toBeTruthy();
    expect(wrapper.find('#test-city').prop('disabled')).toBeTruthy();
    expect(wrapper.find('#test-state').prop('isDisabled')).toBeTruthy();
    expect(wrapper.find('#test-zip-code').prop('disabled')).toBeTruthy();
    expect(wrapper.find('#test-country').prop('isDisabled')).toBeTruthy();
    expect(wrapper.find('#test-phone').prop('disabled')).toBeTruthy();
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
      let inputField = wrapper.find(`#test-${id}`);
      expect(inputField.prop('value')).toEqual(value1);
      input[field] = value2;
      wrapper.setProps({
        ...wrapper.props(),
        value: input,
      });
      inputField = wrapper.find(`#test-${id}`);
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

    describe('state', () => {
      testField(
        'state',
        'state',
        { value: 'testState1', label: 'testStateLabel1' },
        { value: 'testState2', label: 'testStateLabel2' },
      );
    });

    describe('zip code', () => {
      testField('zip-code', 'zipCode', 'testZip1', 'testZip2');
    });

    describe('country', () => {
      testField(
        'country',
        'country',
        { value: 'testCountry1', label: 'testCountryLabel1' },
        { value: 'testCountry2', label: 'testCountryLabel2' },
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
      const inputField = wrapper.find(`#test-${id}`);
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

    test('state', () => {
      const event = { value: 'testState', label: 'testStateLabel' };
      testOnChange('state', event, { field: LOCATION_FIELDS.STATE, value: event });
    });

    test('zip code', () => {
      testOnChange(
        'zip-code',
        { target: { value: 'testZipCode' } },
        { field: LOCATION_FIELDS.ZIP_CODE, value: 'testZipCode' },
      );
    });

    test('country', () => {
      const event = { value: 'testCountry', label: 'testCountryLabel' };
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
