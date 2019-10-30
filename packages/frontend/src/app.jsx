import React, { PureComponent } from 'react';
import { sortBy } from 'lodash';
import PropTypes from 'prop-types';
import { Provider } from 'react-redux';
import { BrowserRouter, Route, Switch, Redirect } from 'react-router-dom';
import Navbar from './navbar';
import Tasks from './tasks';
import Profiles from './profiles';
import Server from './server';
import Settings from './settings';
import { ROUTES, taskActions, globalActions } from './state/actions';
import { THEMES, mapBackgroundThemeToColor, mapToNextTheme } from './constants/themes';

import { addTestId, renderSvgIcon } from './utils';

/* SVGS */
import { ReactComponent as CloseIcon } from './styles/images/app/close.svg';
import { ReactComponent as DeactivateIcon } from './styles/images/app/logout.svg';
import { ReactComponent as MinimizeIcon } from './styles/images/app/minimize.svg';
import { ReactComponent as NightModeIcon } from './styles/images/app/moon.svg';
import { ReactComponent as LightModeIcon } from './styles/images/app/sun.svg';

/* CSS */
import './styles/index.scss';

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
    // this.taskHandler = this.taskHandler.bind(this);
    this._cleanup = this._cleanup.bind(this);
    this.initWSS = this.initWSS.bind(this);
    this.wss = null;
    this.siteInterval = null;
  }

  componentDidMount() {
    if (window.Bridge) {
      const { store } = this.props;
      const { theme } = store.getState();
      const backgroundColor = mapBackgroundThemeToColor[theme];
      window.Bridge.setTheme({ backgroundColor });
      this.initWSS();
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
    const { theme } = store.getState();
    const nextTheme = mapToNextTheme[theme] || THEMES.LIGHT;
    store.dispatch(globalActions.setTheme(nextTheme));
    if (window.Bridge) {
      const backgroundColor = mapBackgroundThemeToColor[nextTheme];
      window.Bridge.setTheme({ backgroundColor });
    }
    this.forceUpdate();
  }

  _cleanup() {
    this._cleanupTaskLog();
    this._cleanupWSS();
  }

  _cleanupTaskLog() {
    const { store } = this.props;
    const { tasks } = store.getState();
    tasks.forEach(t => {
      if (t.status === 'running' || t.status === 'used') {
        store.dispatch(taskActions.stop(t));
      }
    });
  }

  _cleanupWSS() {
    if (window.Bridge) {
      window.Bridge.deregisterForTaskEvents();
    }

    if (this.wss) {
      this.wss.removeAllListeners();
      this.wss.close();
    }
  }

  initWSS() {
    const { store } = this.props;
    this.wss = window.Bridge.server;
    if (this.wss) {
      window.Bridge.registerForTaskEvents();
      console.log(this.wss);
      this.wss.addListener('connection', ws => {
        console.log(`Socket server connected on port 4040`);

        ws.on('message', m => {
          const { taskIds, message } = JSON.parse(m);
          console.log(`[SERVER]: Received message for: ${taskIds}`);

          const buffer = {};
          // eslint-disable-next-line
          [...taskIds].map(taskId => {
            buffer[taskId] = message;
          });
          store.dispatch(taskActions.status(buffer));
        });
      });
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
        store.dispatch(globalActions.fetchSites(sorted));
      }
    } catch (error) {}
  }

  render() {
    const { store, onKeyPress } = this.props;
    const {
      theme,
      navbar: { location: stateLocation },
    } = store.getState();
    const windowLocation = window.location.pathname;
    let redirectRoute = ROUTES.TASKS;
    if (windowLocation !== stateLocation) {
      redirectRoute = stateLocation;
    }
    return (
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
                <Route component={Server} path={ROUTES.SERVER} />
                <Route component={Settings} path={ROUTES.SETTINGS} />
                <Route path="/">
                  <Redirect to={redirectRoute} />
                </Route>
              </Switch>
            </div>
          </div>
        </BrowserRouter>
      </Provider>
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

if (process.env.NODE_ENV !== 'production') {
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, { trackHooks: false });
}

const createApp = (store, props) => <App store={store} {...props} />;

export default createApp;
