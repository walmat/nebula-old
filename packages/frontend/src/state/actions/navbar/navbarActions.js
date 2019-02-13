import makeActionCreator from '../actionCreator';

// Top Level Actions
export const NAVBAR_ACTIONS = {
  ROUTE_HOME: 'ROUTE_HOME',
  ROUTE_TASKS: 'ROUTE_TASKS',
  ROUTE_PROFILES: 'ROUTE_PROFILES',
  ROUTE_PROFILES_OLD: 'ROUTE_PROFILES_OLD',
  ROUTE_SERVER: 'ROUTE_SERVER',
  ROUTE_SETTINGS: 'ROUTE_SETTINGS',
};

export const ROUTES = {
  HOME: '/',
  TASKS: '/tasks',
  PROFILES: '/profiles',
  PROFILES_OLD: '/test',
  SERVER: '/server',
  SETTINGS: '/settings',
};

export const mapActionsToRoutes = {
  [NAVBAR_ACTIONS.ROUTE_HOME]: ROUTES.HOME,
  [NAVBAR_ACTIONS.ROUTE_TASKS]: ROUTES.TASKS,
  [NAVBAR_ACTIONS.ROUTE_PROFILES]: ROUTES.PROFILES,
  [NAVBAR_ACTIONS.ROUTE_PROFILES_OLD]: ROUTES.PROFILES_OLD,
  [NAVBAR_ACTIONS.ROUTE_SERVER]: ROUTES.SERVER,
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
  dispatch(_routeAction(_type)(history));
};

// Public Specific Route Action Generator
const routeAction = type => history => route(type, history);

export const navbarActions = {
  route,
  routeHome: routeAction(NAVBAR_ACTIONS.ROUTE_TASKS),
  routeTasks: routeAction(NAVBAR_ACTIONS.ROUTE_TASKS),
  routeProfiles: routeAction(NAVBAR_ACTIONS.ROUTE_PROFILES),
  routeProfilesOld: routeAction(NAVBAR_ACTIONS.ROUTE_PROFILES_OLD),
  routeServer: routeAction(NAVBAR_ACTIONS.ROUTE_SERVER),
  routeSettings: routeAction(NAVBAR_ACTIONS.ROUTE_SETTINGS),
};
