/* global describe it expect beforeEach */
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import createMemoryHistory from 'history/createMemoryHistory';

import * as actions from '../../../state/actions';
import { initialState } from '../../../state/reducers';

const { navbarActions, NAVBAR_ACTIONS, ROUTES } = actions;
const _createMockStore = configureMockStore([thunk]);

describe('navbar actions', () => {
  let mockHistory;
  let mockStore;

  const routeTests = (action, expectedRoute, expectedActions) => {
    mockStore.dispatch(action);
    const actualActions = mockStore.getActions();
    expect(actualActions.length).toBe(1);
    expect(actualActions).toEqual(expectedActions);
    expect(mockHistory.location.pathname).toBe(expectedRoute);
  };

  beforeEach(() => {
    mockHistory = createMemoryHistory();
    mockStore = _createMockStore(initialState);
  });

  it('should create an action to route anywhere', () => {
    const routeAction = navbarActions.route('ROUTE_SOMEWHERE', mockHistory);
    const expectedActions = [{ type: NAVBAR_ACTIONS.ROUTE_HOME, history: mockHistory }];
    routeTests(routeAction, ROUTES.HOME, expectedActions);
  });

  it('should create an action to route to home', () => {
    const routeAction = navbarActions.routeHome(mockHistory);
    const expectedActions = [{ type: NAVBAR_ACTIONS.ROUTE_HOME, history: mockHistory }];
    routeTests(routeAction, ROUTES.TASKS, expectedActions);
  });

  it('should create an action to route to profiles', () => {
    const routeAction = navbarActions.routeProfiles(mockHistory);
    const expectedActions = [{ type: NAVBAR_ACTIONS.ROUTE_PROFILES, history: mockHistory }];
    routeTests(routeAction, ROUTES.PROFILES, expectedActions);
  });

  it('should create an action to route to tasks', () => {
    const routeAction = navbarActions.routeTasks(mockHistory);
    const expectedActions = [{ type: NAVBAR_ACTIONS.ROUTE_TASKS, history: mockHistory }];
    routeTests(routeAction, ROUTES.TASKS, expectedActions);
  });

  it('should create an action to route to server', () => {
    const routeAction = navbarActions.routeServer(mockHistory);
    const expectedActions = [{ type: NAVBAR_ACTIONS.ROUTE_SERVER, history: mockHistory }];
    routeTests(routeAction, ROUTES.SERVER, expectedActions);
  });

  it('should create an action to route to settings', () => {
    const routeAction = navbarActions.routeSettings(mockHistory);
    const expectedActions = [{ type: NAVBAR_ACTIONS.ROUTE_SETTINGS, history: mockHistory }];
    routeTests(routeAction, ROUTES.SETTINGS, expectedActions);
  });
});
