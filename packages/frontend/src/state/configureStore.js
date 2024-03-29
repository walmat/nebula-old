import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import persistState from 'redux-localstorage';
import topLevelReducer from './reducers';
import profileAttributeValidationMiddleware from './middleware/profiles/profileAttributeValidationMiddleware';
import profileFormValidationMiddleware from './middleware/profiles/profileFormValidationMiddleware';
import tasksFormValidationMiddleware from './middleware/tasks/tasksFormValidationMiddleware';
import tasksAttributeValidationMiddleware from './middleware/tasks/tasksAttributeValidationMiddleware';
import proxyAttributeValidationMiddlware from './middleware/settings/proxyAttributeValidationMiddleware';
import shippingFormAttributeValidationMiddleware from './middleware/settings/shippingFormAttributeValidationMiddleware';
import settingsAttributeValidationMiddleware from './middleware/settings/settingsAttributeValidationMiddleware';

// UNDONE: LogRocket implementation...
// import stateSanitizer from './redactor';

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;


export default function configureStore() {
  return createStore(
    topLevelReducer,
    null,
    composeEnhancers(
      applyMiddleware(
        profileAttributeValidationMiddleware,
        profileFormValidationMiddleware,
        tasksAttributeValidationMiddleware,
        tasksFormValidationMiddleware,
        proxyAttributeValidationMiddlware,
        settingsAttributeValidationMiddleware,
        shippingFormAttributeValidationMiddleware,
        thunk,
      ),
      persistState(),
    ),
  );
}
