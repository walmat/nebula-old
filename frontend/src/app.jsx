import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Provider } from 'react-redux';
import { BrowserRouter, Route, Switch, Redirect } from 'react-router-dom';
import Navbar from './navbar/navbar';
import Tasks from './tasks/tasks';
import Profiles from './profiles/profiles';
import Server from './server/server';
import Settings from './settings/settings';
import Auth from './auth/auth';

import { ROUTES } from './state/actions';

import close from './_assets/close.svg';
import deactivate from './_assets/logout.svg';

import './app.css';

class App extends PureComponent {
  static close(e) {
    e.preventDefault();
    if (window.Bridge) {
      window.Bridge.close();
    }
  }

  static deactivate(e) {
    e.preventDefault();
    if (window.Bridge) {
      window.Bridge.deactivate();
    }
  }

  render() {
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
                onKeyPress={() => {}}
                onClick={(e) => { App.close(e); }}
                draggable="false"
              >
                <img
                  src={deactivate}
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
                onKeyPress={() => {}}
                onClick={(e) => { App.deactivate(e); }}
                draggable="false"
              >
                <img
                  src={close}
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
                <Route component={Auth} path="/auth" />
                <Route path="/">
                  <Redirect to={ROUTES.TASKS} />
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
};

const createApp = store => (<App store={store} />);

export default createApp;
