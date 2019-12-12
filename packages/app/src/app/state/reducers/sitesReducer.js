import { APP_ACTIONS } from '../actions';
import { Stores } from '../initial';

export default (state = Stores, action = {}) => {
  // Return state if a null/undefined action is given
  if (!action) {
    return state || Stores;
  }

  const { type } = action;

  switch (type) {
    case APP_ACTIONS.FETCH_STORES: {
      const { stores } = action;
      if (!stores || (stores && JSON.stringify(stores) === JSON.stringify(state))) {
        return state;
      }

      return stores;
    }
    default:
      return state;
  }
};
