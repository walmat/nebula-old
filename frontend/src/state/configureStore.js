import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import persistState from 'redux-localstorage';
import topLevelReducer, { initialState } from './reducers';
import profileAttributeValidationMiddleware from './middleware/profiles/profileAttributeValidationMiddleware';
import profileFormValidationMiddleware from './middleware/profiles/profileFormValidationMiddleware';
import settingsAttributeValidationMiddleware from './middleware/settings/settingsAttributeValidationMiddleware';
import tasksFormValidationMiddleware from './middleware/tasks/tasksFormValidationMiddleware';
import tasksAttributeValidationMiddleware from './middleware/tasks/tasksAttributeValidationMiddleware';

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

export default function configureStore() {
  return createStore(
    topLevelReducer,
    initialState,
    composeEnhancers(
      applyMiddleware(
        profileAttributeValidationMiddleware,
        profileFormValidationMiddleware,
        tasksAttributeValidationMiddleware,
        tasksFormValidationMiddleware,
        settingsAttributeValidationMiddleware,
        thunk,
      ),
      persistState(),
    ),
  );
}
