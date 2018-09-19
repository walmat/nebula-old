import { mapPaymentFieldToKey } from '../../actions';
import { initialPaymentState } from '../../../utils/definitions/profiles/paymentState';

const paymentReducer = (state = initialPaymentState, action) => {
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
export default paymentReducer;
