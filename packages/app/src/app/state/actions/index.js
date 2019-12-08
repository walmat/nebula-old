import makeActionCreator from '../../../store/creator';
import prefixer from '../../../store/reducers/prefixer';

const prefix = '@@App';
const actionsList = ['SET_THEME', 'FETCH_SITES'];

export const appActionsList = ['@@App/SET_THEME', '@@App/FETCH_SITES'];

// App Actions
export const APP_ACTIONS = prefixer(prefix, actionsList);

export const appActions = {
  sites: makeActionCreator(APP_ACTIONS.FETCH_SITES, 'sites'),
  setTheme: makeActionCreator(APP_ACTIONS.SET_THEME, 'theme'),
  toggleCreate: makeActionCreator(APP_ACTIONS.TOGGLE_CREATE),
};
