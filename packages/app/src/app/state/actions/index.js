import makeActionCreator from '../../../store/creator';

// App Actions
export const APP_ACTIONS = {
  RESET: '@@RESET',
  IMPORT: '@@IMPORT',
  SET_THEME: '@@SET_THEME',
  FETCH_SITES: '@@FETCH_SITES',
  MIGRATE_STATE: '@@MIGRATE_STATE',
  INIT: '@@INIT',
};

export const appActions = {
  reset: makeActionCreator(APP_ACTIONS.RESET),
  import: makeActionCreator(APP_ACTIONS.IMPORT, 'state'),
  setTheme: makeActionCreator(APP_ACTIONS.SET_THEME, 'theme'),
  migrateState: makeActionCreator(APP_ACTIONS.MIGRATE_STATE),
  fetchSites: makeActionCreator(APP_ACTIONS.FETCH_SITES, 'sites'),
};
