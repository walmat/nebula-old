import makeActionCreator from '../actionCreator';

// Top Level Actions
export const NAVBAR_ACTIONS = {
  ROUTE_HOME: 'ROUTE_HOME',
  ROUTE_TASKS: 'ROUTE_TASKS',
  ROUTE_PROFILES: 'ROUTE_PROFILES',
  ROUTE_SERVER: 'ROUTE_SERVER',
  ROUTE_SETTINGS: 'ROUTE_SETTINGS',
};

export const ROUTES = {
  HOME: '/',
  TASKS: '/tasks',
  PROFILES: '/profiles',
  SERVER: '/server',
  SETTINGS: '/settings',
};

export const mapActionsToRoutes = {
  [NAVBAR_ACTIONS.ROUTE_HOME]: ROUTES.HOME,
  [NAVBAR_ACTIONS.ROUTE_TASKS]: ROUTES.TASKS,
  [NAVBAR_ACTIONS.ROUTE_PROFILES]: ROUTES.PROFILES,
  [NAVBAR_ACTIONS.ROUTE_SERVER]: ROUTES.SERVER,
  [NAVBAR_ACTIONS.ROUTE_SETTINGS]: ROUTES.SETTINGS,
};

// Private Action Object Generator for Reducer
const _routeAction = action => makeActionCreator(action, 'history');

// Public General Route Action
const route = (action, history) =>
  (dispatch) => {
    let _action = action;
    if (!mapActionsToRoutes[action]) {
      _action = NAVBAR_ACTIONS.ROUTE_HOME;
    }
    history.push(mapActionsToRoutes[_action] || '/');
    dispatch(_routeAction(_action)(history));
  };

// Public Specific Route Action Generator
const routeAction = action =>
  history => route(action, history);

export const navbarActions = {
  route,
  routeHome: routeAction(NAVBAR_ACTIONS.ROUTE_HOME),
  routeTasks: routeAction(NAVBAR_ACTIONS.ROUTE_TASKS),
  routeProfiles: routeAction(NAVBAR_ACTIONS.ROUTE_PROFILES),
  routeServer: routeAction(NAVBAR_ACTIONS.ROUTE_SERVER),
  routeSettings: routeAction(NAVBAR_ACTIONS.ROUTE_SETTINGS),
};
