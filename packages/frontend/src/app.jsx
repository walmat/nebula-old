import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Provider } from 'react-redux';
import { BrowserRouter, Route, Switch, Redirect } from 'react-router-dom';
import Navbar from './navbar/navbar';
import Tasks from './tasks/tasks';
import Profiles from './profiles/profiles';
import Server from './server/server';
import Settings from './settings/settings';
import { ROUTES, taskActions, globalActions } from './state/actions';
import { THEMES, mapThemeToColor, mapToNextTheme } from './constants/themes';

import { addTestId, renderSvgIcon } from './utils';

/* SVGS */
import { ReactComponent as CloseIcon } from './_assets/close.svg';
import { ReactComponent as DeactivateIcon } from './_assets/logout.svg';
import { ReactComponent as NightModeIcon } from './_assets/moon.svg';
import { ReactComponent as LightModeIcon } from './_assets/sun.svg';

/* CSS */
import './app.css';

export class App extends PureComponent {
  static close(e) {
    e.preventDefault();
    if (window.Bridge) {
      window.Bridge.close();
    }
  }

  static deactivate(store) {
    return async e => {
      e.preventDefault();
      if (window.Bridge) {
        const confirm = await window.Bridge.confirmDialog(
          'Are you sure you want to deactivate Orion? Doing so will erase all data!',
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
  }

  componentDidMount() {
    if (window.Bridge) {
      window.Bridge.registerForTaskEvents(this.taskHandler);
    }
    window.addEventListener('beforeunload', this._cleanup);
  }

  componentWillUnmount() {
    this._cleanup();
    window.removeEventListener('beforeunload', this._cleanup);
  }

  _cleanup() {
    this._cleanupTaskLog();
    this._cleanupTaskEvents();
  }

  async _cleanupTaskLog() {
    const { store } = this.props;
    const { tasks } = store.getState();
    tasks.forEach(t => {
      if (t.status !== 'stopped' || t.status !== 'idle') {
        store.dispatch(taskActions.stop(t));
      }
    });
  }

  _cleanupTaskEvents() {
    if (window.Bridge) {
      window.Bridge.deregisterForTaskEvents(this.taskHandler);
    }
  }

  setTheme(store) {
    const { theme } = store.getState();
    const nextTheme = mapToNextTheme[theme] || THEMES.LIGHT;
    store.dispatch(globalActions.setTheme(nextTheme));
    if (window.Bridge) {
      const backgroundColor = mapThemeToColor[nextTheme];
      window.Bridge.setTheme({ backgroundColor });
    }
    this.forceUpdate();
  }

  taskHandler(event, statusMessageBuffer) {
    const { store } = this.props;
    console.log(statusMessageBuffer);
    store.dispatch(taskActions.status(statusMessageBuffer));
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
                className="close-area-1"
                role="button"
                tabIndex={0}
                title="deactivate"
                onKeyPress={onKeyPress}
                onClick={App.deactivate(store)}
                draggable="false"
                data-testid={addTestId('App.button.deactivate')}
              >
                {renderSvgIcon(DeactivateIcon, {
                  alt: 'deactivate',
                  style: { marginTop: '6px', marginLeft: '6px' },
                })}
              </div>
              <div
                className="close-area-2"
                role="button"
                tabIndex={0}
                title="close"
                onKeyPress={onKeyPress}
                onClick={App.close}
                draggable="false"
                data-testid={addTestId('App.button.close')}
              >
                {renderSvgIcon(CloseIcon, {
                  alt: 'close',
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

const createApp = (store, props) => <App store={store} {...props} />;

export default createApp;
