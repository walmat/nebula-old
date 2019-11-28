import { mapPaymentFieldToKey } from '../../store/actions';
import initialProfileStates from '../../store/initial/profiles';

const paymentReducer = (state = initialProfileStates.payment, action) => {
  console.log('payment reducer handling action: ', action);

  let change = {};
  // If we can't map the field to a payment key, don't change anything
  if (!mapPaymentFieldToKey[action.type]) {
    return Object.assign({}, state);
  }
  switch (action.type) {
    default: {
      change = {
        [mapPaymentFieldToKey[action.type]]:
          action.value || initialProfileStates.payment[mapPaymentFieldToKey[action.type]],
        errors: action.errors || state.errors,
      };
      break;
    }
  }
  return Object.assign({}, state, change);
};
export default paymentReducer;
