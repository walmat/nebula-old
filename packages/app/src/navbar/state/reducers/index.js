import { mapActionsToRoutes } from '../actions';
import Navbar from '../initial';

export default function navbarReducer(state = Navbar, action) {
  console.log('navbar reducer handling action: ', action);
  return { ...state, location: mapActionsToRoutes[action.type] || state.location };
}
