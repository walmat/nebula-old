import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import registerServiceWorker from './registerServiceWorker';
import configureStore from './state/ConfigureStore';

const store = configureStore();

const unsubscribe = store.subscribe(() =>
  console.log(store.getState())
)

ReactDOM.render(
  <App store = {store} />,
  document.getElementById('root')
);
registerServiceWorker();
