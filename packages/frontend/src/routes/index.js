import React from 'react';
import { Switch, Route } from 'react-router';
import { HashRouter } from 'react-router-dom';

/** components */
import { ROUTES } from '../state/actions';
import Tasks from '../tasks';
import Profiles from '../profiles';
import Servers from '../server';
import Settings from '../settings';

export const routes = {
  Tasks: {
    path: ROUTES.TASKS,
    exact: true,
    name: 'Tasks',
    component: Tasks
  },
  Profiles: {
    path: ROUTES.PROFILES,
    exact: true,
    name: 'Profiles',
    component: Profiles
  },
  Server: {
    path: ROUTES.SERVER,
    exact: true,
    name: 'Server',
    component: Servers
  },
  Settings: {
    path: ROUTES.SETTINGS,
    exact: true,
    name: 'Settings',
    component: Settings
  }
};

export default () => (
  <HashRouter>
    <Switch>
      {Object.keys(routes).map(a => (
        <Route
          key={routes[a].path || ROUTES.HOME}
          {...routes[a]}
          component={routes[a].component}
        />
      ))}
    </Switch>
  </HashRouter>
);
