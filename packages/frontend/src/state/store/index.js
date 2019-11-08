import configureStoreDev from './dev';
import configureStoreProd from './prod';

const { NODE_ENV } = process.env;

const IS_PROD = NODE_ENV === 'production';

const selectedConfigureStore = IS_PROD ? configureStoreProd : configureStoreDev;

export const { configureStore } = selectedConfigureStore;
export const { history } = selectedConfigureStore;
