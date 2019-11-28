import { render } from 'react-dom';
import createApp from './app';
import configureStore from './store/config';
import { appActions } from './store/actions';

const MOUNT_POINT = document.getElementById('root');
const store = configureStore();

// dispatch the migrate action...
store.dispatch(appActions.migrateState());

render(createApp(store), MOUNT_POINT);
