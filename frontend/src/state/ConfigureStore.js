import { createStore, applyMiddleware } from 'redux';
import topLevelReducer, { initialState } from './Reducers';
import paymentFormValidationMiddleware from './middleware/profiles/paymentFormValidationMiddleware';
import locationFormValidationMiddleware from './middleware/profiles/locationFormValidationMiddleware';
import { PROFILE_FIELDS } from './Actions';

export default function configureStore() {
  return createStore(
    topLevelReducer,
    initialState,
    applyMiddleware(
      paymentFormValidationMiddleware,
      locationFormValidationMiddleware(PROFILE_FIELDS.EDIT_SHIPPING),
      locationFormValidationMiddleware(PROFILE_FIELDS.EDIT_BILLING),
    ),
  );
}
