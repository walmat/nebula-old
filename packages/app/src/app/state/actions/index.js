import makeActionCreator from '../../../store/creator';

// App Actions
export const APP_ACTIONS = {
  SET_THEME: 'SET_THEME',
};

export const appActions = {
  setTheme: makeActionCreator(APP_ACTIONS.SET_THEME, 'theme'),
};
