import { mapActionsToRoutes } from '../../actions';
import { initialState } from '../../migrators';

const initialNavbarState = initialState.navbar;

export default function navbarReducer(state = initialNavbarState, action) {
  console.log('navbar reducer handling action: ', action);

  const change = {
    location: mapActionsToRoutes[action.type] || state.location,
  };
  return Object.assign({}, state, change);
}
