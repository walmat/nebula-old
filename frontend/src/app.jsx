import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Provider } from 'react-redux';
import { BrowserRouter, Route, Switch, Redirect } from 'react-router-dom';
import Navbar from './navbar/navbar';
import Tasks from './tasks/tasks';
import TasksOld from './tasks/old/tasks';
import Profiles from './profiles/profiles';
import Server from './server/server';
import Settings from './settings/settings';
import Auth from './auth/auth';

import close from './_assets/close.svg';
import deactivate from './_assets/logout.svg';

import './app.css';

class App extends PureComponent {

  static close(e) {
    e.preventDefault();
    if (window.Bridge) {
      window.Bridge.close();
    } else {
      console.error('Unable to close bot, try again.');
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
                onClick={(e) => { App.close(e); }}
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
                <Route component={Tasks} path="/tasks" />
                <Route component={TasksOld} path="/tasksold" /> {/* TEMPORARY */}
                <Route component={Profiles} path="/profiles" />
                <Route component={Server} path="/server" />
                <Route component={Settings} path="/settings" />
                <Route component={Auth} path="/auth" />
                <Route path="/">
                  <Redirect to="/tasks" />
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
