import { createStore, applyMiddleware, compose } from 'redux';
import persistState from 'redux-localstorage';
import { reduxBatch } from '@manaflair/redux-batch';
import thunk from 'redux-thunk';
import rootReducer from '../reducers';

const configureStore = initialState => {
  const composeEnhancers =
    window && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
      ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
      : compose;

  const middleware = [thunk];
  const enhancers = [reduxBatch];
  enhancers.push(applyMiddleware(...middleware));
  const enhancer = composeEnhancers(...enhancers, persistState());

  const store = createStore(rootReducer(), initialState, enhancer);

  store.asyncReducers = {};
  store.injectReducer = (key, reducer) => {
    store.asyncReducers[key] = reducer;
    store.replaceReducer(rootReducer(store.asyncReducers));
    return store;
  };
  return store;
};

export default configureStore;
