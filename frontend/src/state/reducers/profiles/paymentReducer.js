import { mapPaymentFieldToKey } from '../../actions';
import { initialProfileStates } from '../../../utils/definitions/profileDefinitions';

const paymentReducer = (state = initialProfileStates.payment, action) => {
  let change = {};

  switch (action.type) {
    default: {
      change = {
        [mapPaymentFieldToKey[action.type]]: action.value,
      };
      break;
    }
  }

  change.errors = action.errors || state.errors;
  return Object.assign({}, state, change);
};
export default paymentReducer;
