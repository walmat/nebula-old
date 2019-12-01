import { mapPaymentFieldToKey } from '../../../store/actions';
import { payment } from '../initial';

const Payment = (state = payment, action) => {
  console.log('payment reducer handling action: ', action);

  const { type, value } = action;
  if (!type || !mapPaymentFieldToKey[type]) {
    return state;
  }

  switch (type) {
    default:
      return { ...state, [mapPaymentFieldToKey[type]]: value }; 
  }
};
export default Payment;
