/**
 * Container for all state reducers. Reducers are available in their specific
 * files, this is just a shared import point.
 */
import { isEmpty } from 'lodash';
import { APP_ACTIONS } from '../actions';
import topLevelMigrator, { initialState } from '../../../store/migrators';

export default (state = initialState.App, action) => {
  // Return State if a null/undefined action is given
  if (!action) {
    return state || initialState;
  }

  switch (action.type) {
    // case APP_ACTIONS.IMPORT: {
    //   const { state: newState } = action;

    //   // boundary checks
    //   if (!newState || isEmpty(newState) || (newState && !newState.version)) {
    //     return state;
    //   }

    //   return topLevelMigrator(newState);
    // }
    // case APP_ACTIONS.MIGRATE_STATE:
    // case APP_ACTIONS.INIT: {
    //   return topLevelMigrator(state);
    // }
    case APP_ACTIONS.RESET:
      return { ...initialState };
    case APP_ACTIONS.SET_THEME: {
      if (!action.theme) {
        return state;
      }

      const { theme } = action;
      return {
        ...state,
        theme,
      };
    }
    case APP_ACTIONS.FETCH_SITES: {
      if (!action.sites) {
        return state;
      }

      const { sites } = action;
      return { ...state, sites };
    }
    default:
      return state;
  }
};
