import { mapActionsToRoutes } from '../actions';
import Navbar from '../initial';

export default function navbarReducer(state = Navbar, action) {
  const { type } = action;
  // if routing to the same location, don't update the state..
  if (state.location === mapActionsToRoutes[type]) {
    return state;
  }

  return { ...state, location: mapActionsToRoutes[type] || state.location };
}
