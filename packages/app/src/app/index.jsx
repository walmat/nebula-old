import React, { PureComponent } from 'react';
import { AppContainer } from 'react-hot-loader';
import { Provider } from 'react-redux';
import { BrowserRouter, Route, Switch, Redirect } from 'react-router-dom';
import { sortBy, isEmpty } from 'lodash';
import PropTypes from 'prop-types';

// Components
import Navbar from '../navbar';
import Tasks from '../tasks';
import Profiles from '../profiles';
import Settings from '../settings';
import { ROUTES, taskActions, appActions, globalActions } from '../store/actions';
import { THEMES, mapBackgroundThemeToColor, mapToNextTheme } from '../constants/themes';

import { addTestId, renderSvgIcon } from '../utils';

// SVGs
import { ReactComponent as CloseIcon } from '../styles/images/app/close.svg';
import { ReactComponent as DeactivateIcon } from '../styles/images/app/logout.svg';
import { ReactComponent as MinimizeIcon } from '../styles/images/app/minimize.svg';
import { ReactComponent as NightModeIcon } from '../styles/images/app/moon.svg';
import { ReactComponent as LightModeIcon } from '../styles/images/app/sun.svg';

// Styles
import '../styles/index.scss';
import { States } from '../constants/tasks';

export class App extends PureComponent {
  static close(e) {
    e.preventDefault();
    if (window.Bridge) {
      window.Bridge.close();
    }
  }

  static minimize(e) {
    e.preventDefault();
    if (window.Bridge) {
      window.Bridge.minimize();
    }
  }

  static deactivate(store) {
    return async e => {
      e.preventDefault();
      if (window.Bridge) {
        const confirm = await window.Bridge.showDialog(
          'Are you sure you want to deactivate? Doing so will erase all data!',
          'question',
          ['Okay', 'Cancel'],
          'Confirm',
        );
        if (confirm) {
          store.dispatch(globalActions.reset());
          window.Bridge.deactivate();
        }
      }
    };
  }

  constructor(props) {
    super(props);
    this.taskHandler = this.taskHandler.bind(this);
    this._cleanup = this._cleanup.bind(this);

    this.siteInterval = null;
  }

  componentDidMount() {
    if (window.Bridge) {
      const { store } = this.props;
      const {
        App: { theme },
      } = store.getState();
      const backgroundColor = mapBackgroundThemeToColor[theme];
      window.Bridge.setTheme({ backgroundColor });
      window.Bridge.registerForTaskEvents(this.taskHandler);
    }
    this.fetchSites();
    this.siteInterval = setInterval(() => this.fetchSites(), 5000);
    window.addEventListener('beforeunload', this._cleanup);
  }

  componentWillUnmount() {
    this._cleanup();
    clearInterval(this.siteInterval);
    this.siteInterval = null;
    window.removeEventListener('beforeunload', this._cleanup);
  }

  setTheme(store) {
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

  taskHandler(_, statusMessageBuffer) {
    const { store } = this.props;
    if (!isEmpty(statusMessageBuffer)) {
      store.dispatch(taskActions.message(statusMessageBuffer));
    }
  }

  _cleanup() {
    this._cleanupTaskLog();
    this._cleanupTaskEvents();
  }

  _cleanupTaskLog() {
    const { store } = this.props;
    const { Tasks: tasks } = store.getState();

    const runningTasks = tasks.filter(t => t.state === States.Running);
    if (runningTasks && runningTasks.length) {
      store.dispatch(taskActions.stopAll(runningTasks));
    }
  }

  _cleanupTaskEvents() {
    if (window.Bridge) {
      window.Bridge.deregisterForTaskEvents(this.taskHandler);
    }
  }

  async fetchSites() {
    const { store } = this.props;
    try {
      const res = await fetch(`https://nebula-orion-api.herokuapp.com/sites`);

      if (!res.ok) {
        return;
      }

      const sites = await res.json();

      if (sites && sites.length) {
        const sorted = sortBy(sites, site => site.index);
        store.dispatch(appActions.sites(sorted));
      }
    } catch (error) {
      // silently fail...
    }
  }

  render() {
    const { store, onKeyPress } = this.props;
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
              <div className="titlebar">
                <div
                  className="deactivate-button"
                  role="button"
                  tabIndex={0}
                  title="deactivate"
                  onKeyPress={onKeyPress}
                  onClick={App.deactivate(store)}
                  draggable="false"
                  data-testid={addTestId('App.button.deactivate')}
                >
                  {renderSvgIcon(DeactivateIcon, {
                    alt: '',
                    style: { marginTop: '6px', marginLeft: '6px' },
                  })}
                </div>
                <div
                  className="minimize-button"
                  role="button"
                  tabIndex={0}
                  title="minimize"
                  onKeyPress={onKeyPress}
                  onClick={App.minimize}
                  draggable="false"
                  data-testid={addTestId('App.button.minimize')}
                >
                  {renderSvgIcon(MinimizeIcon)}
                </div>
                <div
                  className="close-button"
                  role="button"
                  tabIndex={0}
                  title="close"
                  onKeyPress={onKeyPress}
                  onClick={App.close}
                  draggable="false"
                  data-testid={addTestId('App.button.close')}
                >
                  {renderSvgIcon(CloseIcon, {
                    alt: '',
                    style: { marginTop: '6px', marginLeft: '6px' },
                  })}
                </div>
                <div
                  className="theme-icon"
                  role="button"
                  tabIndex={0}
                  title="theme"
                  onKeyPress={onKeyPress}
                  onClick={() => this.setTheme(store)}
                  draggable="false"
                  data-testid={addTestId('App.button.theme')}
                >
                  {theme === THEMES.LIGHT
                    ? renderSvgIcon(NightModeIcon, {
                        alt: 'night mode',
                        'data-testid': addTestId('App.button.theme.light-mode'),
                        style: { marginTop: '5px', marginLeft: '5px' },
                      })
                    : renderSvgIcon(LightModeIcon, {
                        alt: 'light mode',
                        'data-testid': addTestId('App.button.theme.dark-mode'),
                        style: { marginTop: '6px', marginLeft: '4px' },
                      })}
                </div>
              </div>
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
  onKeyPress: PropTypes.func,
};

App.defaultProps = {
  onKeyPress: () => {},
};

const createApp = (store, props) => <App store={store} {...props} />;

export default createApp;
