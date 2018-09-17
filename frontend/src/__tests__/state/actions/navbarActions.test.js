/* global describe it expect beforeEach jest */
import * as actions from '../../../state/actions';

describe('navbar actions', () => {
  let mockHistory;
  let mockDispatch;
  let historyRoute;

  const routeTests = (action, actionType, route) => {
    expect(action).toBeDefined();
    expect(typeof action).toBe('function');
    action(mockDispatch);
    expect(historyRoute).toBe(route);
    expect(mockDispatch.mock.calls.length).toBe(1);
    expect(mockDispatch.mock.calls[0][0].type).toBe(actionType);
    expect(mockDispatch.mock.calls[0][0].history).toBeDefined();
  };

  beforeEach(() => {
    historyRoute = null;
    mockHistory = {
      push: (route) => {
        historyRoute = route;
      },
    };
    mockDispatch = jest.fn();
  });

  it('should create an action to route anywhere', () => {
    const { navbarActions } = actions;
    const routeAction = navbarActions.route('ROUTE_SOMEWHERE', mockHistory);
    routeTests(routeAction, 'ROUTE_SOMEWHERE', '/');
  });

  it('should create an action to route to profiles', () => {
    const { navbarActions, NAVBAR_ACTIONS, ROUTES } = actions;
    const routeAction = navbarActions.routeProfiles(mockHistory);
    routeTests(routeAction, NAVBAR_ACTIONS.ROUTE_PROFILES, ROUTES.PROFILES);
  });

  it('should create an action to route to tasks', () => {
    const { navbarActions, NAVBAR_ACTIONS, ROUTES } = actions;
    const routeAction = navbarActions.routeTasks(mockHistory);
    routeTests(routeAction, NAVBAR_ACTIONS.ROUTE_TASKS, ROUTES.TASKS);
  });

  it('should create an action to route to server', () => {
    const { navbarActions, NAVBAR_ACTIONS, ROUTES } = actions;
    const routeAction = navbarActions.routeServer(mockHistory);
    routeTests(routeAction, NAVBAR_ACTIONS.ROUTE_SERVER, ROUTES.SERVER);
  });

  it('should create an action to route to settings', () => {
    const { navbarActions, NAVBAR_ACTIONS, ROUTES } = actions;
    const routeAction = navbarActions.routeSettings(mockHistory);
    routeTests(routeAction, NAVBAR_ACTIONS.ROUTE_SETTINGS, ROUTES.SETTINGS);
  });
});
