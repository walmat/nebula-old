import { createStore, applyMiddleware } from 'redux';
import topLevelReducer, { initialState } from './Reducers';
import paymentFormValidationMiddleware from './middleware/profiles/paymentFormValidationMiddleware';

export default function configureStore() {
  return createStore(
    topLevelReducer,
    initialState,
    applyMiddleware(paymentFormValidationMiddleware),
  );
}
