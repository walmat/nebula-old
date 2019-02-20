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
import THEMES from './constants/themes';

import addTestId from './utils/addTestId';

import closeImg from './_assets/close.svg';
import deactivateImg from './_assets/logout.svg';
import night from './_assets/moon.svg';
import day from './_assets/sun.svg';

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
  }

  componentDidMount() {
    if (window.Bridge) {
      window.Bridge.registerForTaskEvents(this.taskHandler);
    }
    window.addEventListener('beforeunload', this._cleanupTaskEvents);
  }

  componentWillUnmount() {
    this._cleanupTaskEvents();
    window.removeEventListener('beforeunload', this._cleanupTaskEvents);
  }

  setTheme(store) {
    const { theme } = store.getState();
    switch (theme) {
      case THEMES.DARK:
        store.dispatch(globalActions.setTheme(THEMES.LIGHT));
        break;
      case THEMES.LIGHT:
        store.dispatch(globalActions.setTheme(THEMES.DARK));
        break;
      default:
        break;
    }
    this.forceUpdate();
  }

  taskHandler(event, taskId, statusMessage) {
    const { store } = this.props;
    store.dispatch(taskActions.status(taskId, statusMessage));
  }

  _cleanupTaskEvents() {
    if (window.Bridge) {
      window.Bridge.deregisterForTaskEvents(this.taskHandler);
    }
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
                <img src={deactivateImg} draggable="false" alt="close" />
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
                <img src={closeImg} draggable="false" alt="close" />
              </div>
              <div
                className="theme-icon"
                role="button"
                tabIndex={0}
                title={theme === THEMES.LIGHT ? 'night mode' : 'light mode'}
                onKeyPress={onKeyPress}
                onClick={() => this.setTheme(store)}
                draggable="false"
              >
                <img src={theme === THEMES.LIGHT ? night : day} draggable="false" alt="theme" />
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
