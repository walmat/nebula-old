import { isEmpty } from 'lodash';

import { APP_ACTIONS } from '../../actions';
import topLevelMigrator, { initialState } from '../../migrators';

const initialAppState = initialState.app || {};

export default function appReducer(state = initialAppState, action) {
  if (!action || (action && !action.type)) {
    return state;
  }

  switch (action.type) {
    case APP_ACTIONS.IMPORT: {
      const { state: newState } = action;

      // boundary checks
      if (!newState || isEmpty(newState) || (newState && !newState.version)) {
        return state;
      }

      return topLevelMigrator(newState);
    }
    case APP_ACTIONS.MIGRATE_STATE:
    case APP_ACTIONS.INIT: {
      return topLevelMigrator(action.state);
    }
    case APP_ACTIONS.SET_THEME: {
      if (action.theme) {
        const { theme } = action;
        return {
          ...state,
          theme,
        };
      }
      return state;
    }
    case APP_ACTIONS.FETCH_SITES: {
      const { sites } = action;
      return { ...state, sites };
    }
    default:
      return state;
  }
}
