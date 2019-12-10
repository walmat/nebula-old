import makeActionCreator from '../../../store/creator';
import prefixer from '../../../store/reducers/prefixer';

const prefix = '@@App';
const actionsList = ['SET_THEME', 'FETCH_STORES'];

export const appActionsList = ['@@App/SET_THEME', '@@App/FETCH_STORES'];

// App Actions
export const APP_ACTIONS = prefixer(prefix, actionsList);

export const appActions = {
  stores: makeActionCreator(APP_ACTIONS.FETCH_STORES, 'stores'),
  setTheme: makeActionCreator(APP_ACTIONS.SET_THEME, 'theme'),
};
