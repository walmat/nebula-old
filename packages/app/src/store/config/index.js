import configureStoreDev from './dev';
import configureStoreProd from './prod';

const IS_PROD = process.env.NODE_ENV !== 'development';

const selectedConfigureStore = IS_PROD ? configureStoreProd : configureStoreDev;

export default selectedConfigureStore;
