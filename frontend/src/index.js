import ReactDOM from 'react-dom';
import createApp from './app';
// import registerServiceWorker from './registerServiceWorker';
import configureStore from './state/configureStore';

const store = configureStore();

ReactDOM.render(
  createApp(store),
  document.getElementById('root'),
);
// registerServiceWorker();
