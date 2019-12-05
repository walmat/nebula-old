/**
 * Container for all state reducers. Reducers are available in their specific
 * files, this is just a shared import point.
 */
import { GLOBAL_ACTIONS } from '../../../store/actions';
import { APP_ACTIONS } from '../actions';
import { App } from '../initial';

export default (state = App, action) => {
  // Return State if a null/undefined action is given
  if (!action) {
    return state || App;
  }

  const { type } = action;

  switch (type) {
    case GLOBAL_ACTIONS.RESET:
      return App;
    case APP_ACTIONS.SET_THEME: {
      const { theme } = action;
      if (!theme || (theme && theme === state.theme)) {
        return state;
      }

      return { ...state, theme };
    }
    case APP_ACTIONS.TOGGLE_CREATE:
      return { ...state, toggleCreate: !state.toggleCreate };
    default:
      return state;
  }
};
