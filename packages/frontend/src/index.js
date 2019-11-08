import React from 'react';
import { render } from 'react-dom';
import Root from './root';
import { AppContainer } from 'react-hot-loader';
import { configureStore, history } from './state/store';

const MOUNT_POINT = document.getElementById('root');
const store = configureStore();

render(
  <AppContainer>
    <Root store={store} history={history} />
  </AppContainer>,
  MOUNT_POINT
);

if (module.hot) {
  module.hot.accept('./root', () => {
    const NextRoot = require('./root').default;
    render(
      <AppContainer>
        <NextRoot store={store} history={history} />
      </AppContainer>,
      MOUNT_POINT
    );
  });
}
