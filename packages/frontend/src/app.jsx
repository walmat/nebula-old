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

import addTestId from './utils/addTestId';

import closeImg from './_assets/close.svg';
import deactivateImg from './_assets/logout.svg';

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

  componentWillMount() {
    if (window.Bridge) {
      window.Bridge.registerForTaskEvents(this.taskHandler);
    }
  }

  componentWillUnmount() {
    if (window.Bridge) {
      window.Bridge.deregisterForTaskEvents(this.taskHandler);
    }
  }

  taskHandler(event, taskId, statusMessage) {
    const { store } = this.props;
    store.dispatch(taskActions.status(taskId, statusMessage));
  }

  render() {
    const stateLocation = this.props.store.getState().navbar.location;
    const windowLocation = window.location.pathname;
    let redirectRoute = ROUTES.TASKS;
    if (windowLocation !== stateLocation) {
      redirectRoute = stateLocation;
    }
    return (
      <Provider store={this.props.store}>
        <BrowserRouter>
          <div id="container-wrapper">
            <div className="titlebar">
              <div
                className="close-area-1"
                role="button"
                tabIndex={0}
                title="deactivate"
                onKeyPress={this.props.onKeyPress}
                onClick={App.deactivate(this.props.store)}
                draggable="false"
                data-testid={addTestId('App.button.deactivate')}
              >
                <img
                  src={deactivateImg}
                  draggable="false"
                  alt="close"
                  style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    cursor: 'pointer',
                    verticalAlign: 'middle',
                    width: '12px',
                    height: '12px',
                  }}
                />
              </div>
              <div
                className="close-area-2"
                role="button"
                tabIndex={0}
                title="close"
                onKeyPress={this.props.onKeyPress}
                onClick={App.close}
                draggable="false"
                data-testid={addTestId('App.button.close')}
              >
                <img
                  src={closeImg}
                  draggable="false"
                  alt="close"
                  style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    cursor: 'pointer',
                    verticalAlign: 'middle',
                    width: '12px',
                    height: '12px',
                  }}
                />
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
