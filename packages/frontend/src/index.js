import { render } from 'react-dom';
import createApp from './app';
import configureStore from './state/configureStore';
import { globalActions } from './state/actions';

const store = configureStore();
store.dispatch(globalActions.migrateState());

render(createApp(store), document.getElementById('root'));
