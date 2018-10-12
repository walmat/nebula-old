/* global describe it expect beforeEach jest test */
import React from 'react';
import { shallow } from 'enzyme';

import { PaymentFieldsPrimitive, mapStateToProps, mapDispatchToProps } from '../../profiles/paymentFields';
import { PROFILE_FIELDS, PAYMENT_FIELDS, profileActions } from '../../state/actions';
import { initialProfileStates } from '../../utils/definitions/profileDefinitions';

describe('<PaymentFields />', () => {
  it('should render with required props', () => {
    const payment = {
      ...initialProfileStates.payment,
    };
    const wrapper = shallow(<PaymentFieldsPrimitive
      onChange={() => {}}
      value={payment}
      errors={payment.errors}
    />);
    expect(wrapper.find('#email')).toHaveLength(1);
    expect(wrapper.find('#expiration')).toHaveLength(1);
    expect(wrapper.find('#card-number')).toHaveLength(1);
    expect(wrapper.find('#cvv')).toHaveLength(1);
  });

  describe('should render correct values for', () => {
    const testFieldValue = (id, field, value1, value2) => {
      const payment = {
        ...initialProfileStates.payment,
        [field]: value1,
      };
      const wrapper = shallow(<PaymentFieldsPrimitive
        onChange={() => {}}
        value={payment}
        errors={payment.errors}
      />);
      let inputField = wrapper.find(`#${id}`);
      expect(inputField).toHaveLength(1);
      expect(inputField.prop('value')).toBe(value1);

      payment[field] = value2;
      wrapper.setProps({
        ...wrapper.props(),
        value: payment,
      });
      inputField = wrapper.find(`#${id}`);
      expect(inputField).toHaveLength(1);
      expect(inputField.prop('value')).toBe(value2);
    };

    test('email', () => {
      testFieldValue('email', PAYMENT_FIELDS.EMAIL, 'test@me.com', 'test.2@me.com');
    });

    test('card number', () => {
      testFieldValue('card-number', PAYMENT_FIELDS.CARD_NUMBER, '1234 5678 9012 3456', '4111 1111 1111 1111');
    });

    test('expiration', () => {
      testFieldValue('expiration', PAYMENT_FIELDS.EXP, '12/34', '01/23');
    });

    test('cvv', () => {
      testFieldValue('cvv', PAYMENT_FIELDS.CVV, '123', '013');
    });
  });

  describe('should call onChange handler when editing', () => {
    const testOnChange = (id, event, expectedCall) => {
      const input = { ...initialProfileStates.payment };
      const onChangeHandler = jest.fn();
      const wrapper = shallow(<PaymentFieldsPrimitive
        onChange={onChangeHandler}
        value={input}
        errors={input.errors}
      />);
      const inputField = wrapper.find(`#${id}`);
      expect(inputField).toHaveLength(1);
      inputField.simulate('change', event);
      expect(onChangeHandler).toHaveBeenCalledWith(expectedCall);
    };

    test('email', () => {
      testOnChange(
        'email',
        { target: { value: 'newemail' } },
        { field: PAYMENT_FIELDS.EMAIL, value: 'newemail' },
      );
    });

    test('card number', () => {
      testOnChange(
        'card-number',
        { target: { value: '1234567890123456' } },
        { field: PAYMENT_FIELDS.CARD_NUMBER, value: '1234567890123456' },
      );
    });

    test('exp', () => {
      testOnChange(
        'expiration',
        { target: { value: '12/34' } },
        { field: PAYMENT_FIELDS.EXP, value: '12/34' },
      );
    });

    test('cvv', () => {
      testOnChange(
        'cvv',
        { target: { value: '1234' } },
        { field: PAYMENT_FIELDS.CVV, value: '1234' },
      );
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
    const actual = mapStateToProps({}, { profileToEdit: profile });
    expect(actual.value).toEqual(profile.payment);
    expect(actual.errors).toEqual(profile.payment.errors);
  });

  test('map dispatch to props returns correct structure', () => {
    const profile = {
      ...initialProfileStates.profile,
      id: 'test',
    };
    const changes = {
      field: PAYMENT_FIELDS.EMAIL,
      value: 'new.test@email.com',
    };
    const dispatch = jest.fn();
    const actual = mapDispatchToProps(dispatch, { profileToEdit: profile });
    expect(actual.onChange).toBeDefined();
    actual.onChange(changes);
    expect(dispatch).toHaveBeenCalledWith(profileActions.edit('test', PROFILE_FIELDS.EDIT_PAYMENT, changes.value, changes.field));
  });

  describe('card expiration format', () => {
    test('should handle valid months', () => {
      for (let i = 1; i <= 12; i += 1) {
        const exp = `${i}/42`;
        if (i < 10) {
          expect(PaymentFieldsPrimitive.cardExpiry(exp)).toBe(`0${i}/42`);
        } else {
          expect(PaymentFieldsPrimitive.cardExpiry(exp)).toBe(`${i}/42`);
        }
      }
    });

    test('should handle invalid number months', () => {
      let exp = '13/42';
      expect(PaymentFieldsPrimitive.cardExpiry(exp)).toBe('12/42');
      exp = '0/42';
      expect(PaymentFieldsPrimitive.cardExpiry(exp)).toBe('01/42');
      exp = '-1/42';
      expect(PaymentFieldsPrimitive.cardExpiry(exp)).toBe('01/42');
    });

    test('should handle invalid string months', () => {
      let exp = 'ab/42';
      expect(PaymentFieldsPrimitive.cardExpiry(exp)).toBe('12/42');
      exp = 'td/42';
      expect(PaymentFieldsPrimitive.cardExpiry(exp)).toBe('12/42');
      exp = 'a˚/42';
      expect(PaymentFieldsPrimitive.cardExpiry(exp)).toBe('12/42');
    });

    test('should handle no year', () => {
      let exp = '01';
      expect(PaymentFieldsPrimitive.cardExpiry(exp)).toBe('01');
      exp = '01/';
      expect(PaymentFieldsPrimitive.cardExpiry(exp)).toBe('01');
    });

    test('should handle year', () => {
      let exp = '01/32';
      expect(PaymentFieldsPrimitive.cardExpiry(exp)).toBe('01/32');
      exp = '01/234/232';
      expect(PaymentFieldsPrimitive.cardExpiry(exp)).toBe('01/23');
      exp = '01/2';
      expect(PaymentFieldsPrimitive.cardExpiry(exp)).toBe('01/2');
    });
  });
});
