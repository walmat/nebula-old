import ReactDOM from 'react-dom';
import LogRocket from 'logrocket';
import setupLogRocketReact from 'logrocket-react';
import createApp from './app';
// import registerServiceWorker from './registerServiceWorker';
import configureStore from './state/configureStore';
import { globalActions } from './state/actions';

const store = configureStore();
LogRocket.init('6pbztv/nebula');
setupLogRocketReact(LogRocket);
store.dispatch(globalActions.migrateState());

ReactDOM.render(createApp(store), document.getElementById('root'));
// registerServiceWorker();
