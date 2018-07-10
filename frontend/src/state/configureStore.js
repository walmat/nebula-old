import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import topLevelReducer, { initialState } from './reducers';
import profileAttributeValidationMiddleware from './middleware/profiles/profileAttributeValidationMiddleware';
import profileFormValidationMiddleware from './middleware/profiles/profileFormValidationMiddleware';
import profileApiMiddleware from './middleware/profiles/profileFormApiMiddleware';

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

export default function configureStore() {
  return createStore(
    topLevelReducer,
    initialState,
    composeEnhancers(applyMiddleware(
      profileAttributeValidationMiddleware,
      profileFormValidationMiddleware,
      profileApiMiddleware,
      thunk,
    )),
  );
}
