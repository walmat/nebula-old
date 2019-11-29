/**
 * Container for all state reducers. Reducers are available in their specific
 * files, this is just a shared import point.
 */
import { APP_ACTIONS } from '../actions';
import { Sites } from '../initial';

export default (state = Sites, action) => {
  // Return state if a null/undefined action is given
  if (!action) {
    return state || Sites;
  }

  const { type } = action;

  switch (type) {
    case APP_ACTIONS.FETCH_SITES: {
      const { sites } = action;
      if (!sites || (sites && JSON.stringify(sites) === JSON.stringify(state))) {
        return state;
      }

      return sites;
    }
    default:
      return state;
  }
};
