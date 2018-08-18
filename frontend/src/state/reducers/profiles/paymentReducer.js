import { PAYMENT_FIELDS } from '../../actions';

export const initialPaymentState = {
  email: '',
  cardNumber: '',
  exp: '',
  cvv: '',
  errors: {
    email: null,
    cardNumber: null,
    exp: null,
    cvv: null,
  },
};

export const paymentReducer = (state = initialPaymentState, action) => {
  let change = {};

  switch (action.type) {
    case PAYMENT_FIELDS.EMAIL:
      change = { email: action.value }; break;
    case PAYMENT_FIELDS.CARD_NUMBER:
      change = { cardNumber: action.value }; break;
    case PAYMENT_FIELDS.EXP:
      if (action.value > 1 && action.value.length === 1) {
        change = { exp: `0${action.value}` };
      } else {
        change = { exp: action.value };
      }
      break;
    case PAYMENT_FIELDS.CVV:
      change = { cvv: action.value }; break;
    default:
      break;
  }

  change.errors = action.errors;
  return Object.assign({}, state, change);
};
