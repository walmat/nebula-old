import { mapPaymentFieldToKey } from '../../actions';

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
    default: {
      change = {
        [mapPaymentFieldToKey[action.type]]: action.value,
      };
      break;
    }
  }

  change.errors = action.errors;
  return Object.assign({}, state, change);
};
