import React from 'react';
import ReactDOM from 'react-dom';
import { createStore } from 'redux';
import App from './App';
import registerServiceWorker from './registerServiceWorker';

import topLevelReducer from './state/Reducers';

const store = createStore(topLevelReducer);

const unsubscribe = store.subscribe(() =>
  console.log(store.getState())
)

ReactDOM.render(
  <App store = {store} />,
  document.getElementById('root')
);
registerServiceWorker();
