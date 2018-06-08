import { PAYMENT_FIELDS } from '../../Actions';

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
      change = { exp: action.value }; break;
    case PAYMENT_FIELDS.CVV:
      change = { cvv: action.value }; break;
    default:
      break;
  }

  change.errors = action.errors;
  return Object.assign({}, state, change);
};
