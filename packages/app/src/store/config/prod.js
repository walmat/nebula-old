import { createStore, applyMiddleware, compose } from 'redux';
import persistState from 'redux-localstorage';
import thunk from 'redux-thunk';
import rootReducer from '../reducers';

import profileAttributeValidationMiddleware from '../middleware/profiles/profileAttributeValidationMiddleware';
import profileFormValidationMiddleware from '../middleware/profiles/profileFormValidationMiddleware';
import tasksFormValidationMiddleware from '../middleware/tasks/tasksFormValidationMiddleware';
import tasksAttributeValidationMiddleware from '../middleware/tasks/tasksAttributeValidationMiddleware';
import proxyAttributeValidationMiddlware from '../middleware/settings/proxyAttributeValidationMiddleware';
import shippingFormAttributeValidationMiddleware from '../middleware/settings/shippingFormAttributeValidationMiddleware';
import settingsAttributeValidationMiddleware from '../middleware/settings/settingsAttributeValidationMiddleware';

const composeEnhancers =
  window && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
    ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
    : compose;

const middleware = [
  profileAttributeValidationMiddleware,
  profileFormValidationMiddleware,
  tasksAttributeValidationMiddleware,
  tasksFormValidationMiddleware,
  proxyAttributeValidationMiddlware,
  settingsAttributeValidationMiddleware,
  shippingFormAttributeValidationMiddleware,
  thunk,
];
const enhancer = composeEnhancers(applyMiddleware(...middleware), persistState());

const configureStore = () => {
  const store = createStore(rootReducer(), null, enhancer);

  store.asyncReducers = {};
  store.injectReducer = (key, reducer) => {
    store.asyncReducers[key] = reducer;
    store.replaceReducer(rootReducer(store.asyncReducers));
    return store;
  };
  return store;
};

export default configureStore;
