/* global describe it expect */
import paymentReducer from '../../../state/reducers/profiles/paymentReducer';
import { PAYMENT_FIELDS } from '../../../state/actions';
import { initialProfileStates } from '../../../utils/definitions/profileDefinitions';

describe('payment reducer', () => {
  it('should return initial state', () => {
    const actual = paymentReducer(undefined, {});
    expect(actual).toEqual(initialProfileStates.payment);
  });

  it('should handle edit email action', () => {
    const expected = {
      ...initialProfileStates.payment,
      email: 'testing',
    };
    const actual = paymentReducer(
      initialProfileStates.payment,
      { type: PAYMENT_FIELDS.EMAIL, value: 'testing' },
    );
    expect(actual).toEqual(expected);
  });

  it('should handle edit card number action', () => {
    const expected = {
      ...initialProfileStates.payment,
      cardNumber: 'testing',
    };
    const actual = paymentReducer(
      initialProfileStates.payment,
      { type: PAYMENT_FIELDS.CARD_NUMBER, value: 'testing' },
    );
    expect(actual).toEqual(expected);
  });

  it('should handle edit expiration action', () => {
    const expected = {
      ...initialProfileStates.payment,
      exp: 'testing',
    };
    const actual = paymentReducer(
      initialProfileStates.payment,
      { type: PAYMENT_FIELDS.EXP, value: 'testing' },
    );
    expect(actual).toEqual(expected);
  });

  it('should handle edit cvv action', () => {
    const expected = {
      ...initialProfileStates.payment,
      cvv: 'testing',
    };
    const actual = paymentReducer(
      initialProfileStates.payment,
      { type: PAYMENT_FIELDS.CVV, value: 'testing' },
    );
    expect(actual).toEqual(expected);
  });

  it('should not respond to invalid actions', () => {
    const actual = paymentReducer(
      initialProfileStates.payment,
      { type: 'INVALID' },
    );
    expect(actual).toEqual(initialProfileStates.payment);
  });
});
