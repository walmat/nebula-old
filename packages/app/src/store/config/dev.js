import { createStore, applyMiddleware, compose } from 'redux';
import persistState from 'redux-localstorage';
import thunk from 'redux-thunk';
import { createLogger } from 'redux-logger';
import rootReducer from '../reducers';

// import profileAttributeValidationMiddleware from '../middleware/profiles/profileAttributeValidationMiddleware';
// import profileFormValidationMiddleware from '../middleware/profiles/profileFormValidationMiddleware';
// import tasksFormValidationMiddleware from '../middleware/tasks/tasksFormValidationMiddleware';
// import tasksAttributeValidationMiddleware from '../middleware/tasks/tasksAttributeValidationMiddleware';
// import proxyAttributeValidationMiddlware from '../middleware/settings/proxyAttributeValidationMiddleware';
// import shippingFormAttributeValidationMiddleware from '../middleware/settings/shippingFormAttributeValidationMiddleware';
// import settingsAttributeValidationMiddleware from '../middleware/settings/settingsAttributeValidationMiddleware';

const configureStore = initialState => {
  // Redux Configuration
  const middleware = [
    // profileAttributeValidationMiddleware,
    // profileFormValidationMiddleware,
    // tasksAttributeValidationMiddleware,
    // tasksFormValidationMiddleware,
    // proxyAttributeValidationMiddlware,
    // settingsAttributeValidationMiddleware,
    // shippingFormAttributeValidationMiddleware,
  ];
  const enhancers = [];

  // Thunk Middleware
  middleware.push(thunk);

  // Logging Middleware
  const logger = createLogger({
    level: 'info',
    collapsed: true,
  });

  // Skip redux logs in console during the tests
  if (process.env.NODE_ENV !== 'test') {
    middleware.push(logger);
  }

  // If Redux DevTools Extension is installed use it, otherwise use Redux compose
  const composeEnhancers =
    window && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
      ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
      : compose;

  // Apply Middleware & Compose Enhancers
  enhancers.push(applyMiddleware(...middleware));
  const enhancer = composeEnhancers(...enhancers, persistState());

  // Create Store
  const store = createStore(rootReducer(), initialState, enhancer);

  store.asyncReducers = {};
  store.injectReducer = (key, reducer) => {
    store.asyncReducers[key] = reducer;
    store.replaceReducer(rootReducer(store.asyncReducers));
    return store;
  };

  if (module.hot) {
    // eslint-disable-next-line global-require
    module.hot.accept('../reducers', () => store.replaceReducer(require('../reducers').default));
  }

  return store;
};

export default configureStore;
