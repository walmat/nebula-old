import makeActionCreator from '../../../store/creator';
import prefixer from '../../../store/reducers/prefixer';

const prefix = '@@Navbar';
const actionsList = ['ROUTE_HOME', 'ROUTE_TASKS', 'ROUTE_PROFILES', 'ROUTE_SETTINGS'];
export const navbarActionsList = [
  '@@Navbar/ROUTE_HOME',
  '@@Navbar/ROUTE_TASKS',
  '@@Navbar/ROUTE_PROFILES',
  '@@Navbar/ROUTE_SETTINGS',
];

export const NAVBAR_ACTIONS = prefixer(prefix, actionsList);

export const ROUTES = {
  HOME: '/',
  TASKS: '/tasks',
  PROFILES: '/profiles',
  SETTINGS: '/settings',
};

export const mapActionsToRoutes = {
  [NAVBAR_ACTIONS.ROUTE_HOME]: ROUTES.HOME,
  [NAVBAR_ACTIONS.ROUTE_TASKS]: ROUTES.TASKS,
  [NAVBAR_ACTIONS.ROUTE_PROFILES]: ROUTES.PROFILES,
  [NAVBAR_ACTIONS.ROUTE_SETTINGS]: ROUTES.SETTINGS,
};

// Private Action Object Generator for Reducer
const _routeAction = type => makeActionCreator(type, 'history');

// Public General Route Action
const route = (type, history) => dispatch => {
  let _type = type;
  if (!mapActionsToRoutes[type]) {
    _type = NAVBAR_ACTIONS.ROUTE_HOME;
  }
  history.push(mapActionsToRoutes[_type] || '/');
  return dispatch(_routeAction(_type)(history));
};

// Public Specific Route Action Generator
const routeAction = type => history => route(type, history);

export const navbarActions = {
  route,
  routeHome: routeAction(NAVBAR_ACTIONS.ROUTE_TASKS),
  routeTasks: routeAction(NAVBAR_ACTIONS.ROUTE_TASKS),
  routeProfiles: routeAction(NAVBAR_ACTIONS.ROUTE_PROFILES),
  routeSettings: routeAction(NAVBAR_ACTIONS.ROUTE_SETTINGS),
};
