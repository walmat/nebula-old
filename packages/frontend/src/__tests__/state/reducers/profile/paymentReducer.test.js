/* global describe it expect */
import paymentReducer from '../../../../state/reducers/profiles/paymentReducer';
import { PAYMENT_FIELDS } from '../../../../state/actions';
import { initialProfileStates } from '../../../../utils/definitions/profileDefinitions';

describe('payment reducer', () => {
  it('should return initial state', () => {
    const actual = paymentReducer(undefined, {});
    expect(actual).toEqual(initialProfileStates.payment);
  });

  describe('when editing', () => {
    const _testEditField = field => {
      it('should update when using a non-null value', () => {
        const expected = {
          ...initialProfileStates.payment,
          [field]: 'testing',
        };
        const actual = paymentReducer(initialProfileStates.payment, {
          type: field,
          value: 'testing',
        });
        expect(actual).toEqual(expected);
      });

      it('should update when using an empty value', () => {
        const expected = {
          ...initialProfileStates.payment,
        };
        const actual = paymentReducer(initialProfileStates.payment, {
          type: field,
          value: '',
        });
        expect(actual).toEqual(expected);
      });

      it('should clear the state when using a null value', () => {
        const expected = {
          ...initialProfileStates.payment,
        };
        const actual = paymentReducer(initialProfileStates.payment, {
          type: field,
          value: null,
        });
        expect(actual).toEqual(expected);
      });
    };

    describe('email', () => _testEditField(PAYMENT_FIELDS.EMAIL));

    describe('card number', () => _testEditField(PAYMENT_FIELDS.CARD_NUMBER));

    describe('expiration', () => _testEditField(PAYMENT_FIELDS.EXP));

    describe('cvv', () => _testEditField(PAYMENT_FIELDS.CVV));
  });

  it('should not respond to invalid actions', () => {
    const actual = paymentReducer(initialProfileStates.payment, {
      type: 'INVALID',
    });
    expect(actual).toEqual(initialProfileStates.payment);
  });
});
