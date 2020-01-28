import React, { PureComponent } from 'react';
import { AppContainer, setConfig } from 'react-hot-loader';
import { Provider } from 'react-redux';
import { BrowserRouter, Route, Switch, Redirect } from 'react-router-dom';
import { isEmpty } from 'lodash';
import moment from 'moment';
import PropTypes from 'prop-types';

// Components
import Titlebar from './components/titlebar';
import Navbar from '../navbar';
import Tasks from '../tasks';
import Profiles from '../profiles';
import Settings from '../settings';

import { ROUTES, taskActions, appActions } from '../store/actions';
import {
  THEMES,
  mapBackgroundThemeToColor,
  mapToNextTheme,
  fetchSites,
  States,
} from '../constants';

// Styles
import '../styles/index.scss';

export class App extends PureComponent {
  constructor(props) {
    super(props);
    this.taskHandler = this.taskHandler.bind(this);
    this._cleanupTasks = this._cleanupTasks.bind(this);
    this._schedule = this._schedule.bind(this);
    this._setTheme = this._setTheme.bind(this);

    this.scheduler = null;
    this.siteInterval = null;
  }

  componentDidMount() {
    const { store } = this.props;
    if (window.Bridge) {
      const {
        App: { theme },
        Webhooks,
      } = store.getState();
      const backgroundColor = mapBackgroundThemeToColor[theme];
      window.Bridge.setTheme({ backgroundColor });
      window.Bridge.registerForTaskEvents(this.taskHandler);
      if (Webhooks.length) {
        window.Bridge.addWebhooks(Webhooks);
      }
    }

    // fetch store API updates
    fetchSites(store);
    this.siteInterval = setInterval(() => fetchSites(store), 5000);

    // start the task scheduler
    this._schedule();
    this.scheduler = setInterval(() => this._schedule(), 1000);
    window.addEventListener('beforeunload', this._cleanupTasks);
  }

  componentWillUnmount() {
    this._cleanupTasks();
    clearInterval(this.siteInterval);
    this.siteInterval = null;
    window.removeEventListener('beforeunload', this._cleanupTasks);
  }

  _cleanupTasks() {
    const { store } = this.props;
    const { Tasks: tasks } = store.getState();

    const runningTasks = tasks.filter(t => t.state === States.Running);
    if (runningTasks && runningTasks.length) {
      store.dispatch(taskActions.stop(runningTasks));
    }
    if (window.Bridge) {
      window.Bridge.deregisterForTaskEvents(this.taskHandler);
    }
  }

  _schedule() {
    const { store } = this.props;
    const { Tasks: tasks, Delays: delays, Proxies: proxies } = store.getState();

    const timeChecker = now => {
      const diff = moment(now).diff(moment(), 'seconds');

      // if the tasks are more than 10s overdue, don't start them...
      return diff <= 0 && diff > -10;
    };

    const tasksToRun = tasks.filter(
      t => t.schedule && timeChecker(t.schedule) && t.state !== States.Running,
    );
    if (tasksToRun && tasksToRun.length) {
      store.dispatch(taskActions.start(tasksToRun, delays, proxies));
    }
  }

  _setTheme() {
    const { store } = this.props;
    const {
      App: { theme },
    } = store.getState();
    const nextTheme = mapToNextTheme[theme] || THEMES.LIGHT;
    store.dispatch(appActions.setTheme(nextTheme));
    if (window.Bridge) {
      const backgroundColor = mapBackgroundThemeToColor[nextTheme];
      window.Bridge.setTheme({ backgroundColor });
    }
    this.forceUpdate();
  }

  taskHandler(_, statusMessages) {
    const { store } = this.props;
    if (!isEmpty(statusMessages)) {
      store.dispatch(taskActions.message(statusMessages));
    }
  }

  render() {
    const { store } = this.props;
    const {
      App: { theme },
      Navbar: { location: stateLocation },
    } = store.getState();
    const windowLocation = window.location.pathname;
    let redirectRoute = ROUTES.TASKS;
    if (windowLocation !== stateLocation) {
      redirectRoute = stateLocation;
    }
    return (
      <AppContainer>
        <Provider store={store}>
          <BrowserRouter>
            <div id="container-wrapper" className={`theme-${theme}`}>
              <Titlebar theme={theme} store={store} onSetTheme={this._setTheme} />
              <Navbar />
              <div className="main-container">
                <Switch>
                  <Route component={Tasks} path={ROUTES.TASKS} />
                  <Route component={Profiles} path={ROUTES.PROFILES} />
                  <Route component={Settings} path={ROUTES.SETTINGS} />
                  <Route path="/">
                    <Redirect to={redirectRoute} />
                  </Route>
                </Switch>
              </div>
            </div>
          </BrowserRouter>
        </Provider>
      </AppContainer>
    );
  }
}

App.propTypes = {
  store: PropTypes.objectOf(PropTypes.any).isRequired,
};

setConfig({ showReactDomPatchNotification: false });
const createApp = (store, props) => <App store={store} {...props} />;

export default createApp;
