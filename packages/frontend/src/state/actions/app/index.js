import makeActionCreator from '../actionCreator';

export const APP_ACTIONS = {
  RESET: '@@RESET',
  IMPORT: '@@IMPORT',
  SET_THEME: '@@SET_THEME',
  FETCH_SITES: '@@FETCH_SITES',
  MIGRATE_STATE: '@@MIGRATE_STATE',
  INIT: '@@INIT',
};

export const reset = makeActionCreator(APP_ACTIONS.RESET);
export const importState = makeActionCreator(APP_ACTIONS.IMPORT, 'state');
export const setTheme = makeActionCreator(APP_ACTIONS.SET_THEME, 'theme');
export const migrateState = makeActionCreator(APP_ACTIONS.MIGRATE_STATE);
export const fetchSites = makeActionCreator(APP_ACTIONS.FETCH_SITES, 'sites');
