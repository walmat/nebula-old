import { render } from 'react-dom';
import createApp from './app';
import configureStore from './store/config';

const MOUNT_POINT = document.getElementById('root');
const store = configureStore();

render(createApp(store), MOUNT_POINT);
