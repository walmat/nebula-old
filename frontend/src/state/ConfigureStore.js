import { createStore, applyMiddleware } from 'redux';
import topLevelReducer, { initialState } from './Reducers';
import profileAttributeValidationMiddleware from './middleware/profiles/profileAttributeValidationMiddleware';
import profileFormValidationMiddleware from './middleware/profiles/profileFormValidationMiddleware';

export default function configureStore() {
  return createStore(
    topLevelReducer,
    initialState,
    applyMiddleware(
      profileAttributeValidationMiddleware,
      profileFormValidationMiddleware,
    ),
  );
}
