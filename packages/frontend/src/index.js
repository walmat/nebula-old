import ReactDOM from 'react-dom';
import createApp from './app';
// import registerServiceWorker from './registerServiceWorker';
import configureStore from './state/configureStore';
import { globalActions } from './state/actions';

const store = configureStore();
store.dispatch(globalActions.migrateState());

ReactDOM.render(createApp(store), document.getElementById('root'));
// registerServiceWorker();
