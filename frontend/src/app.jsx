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

import './app.css';

class App extends PureComponent {
  render() {
    /*The Router path='/' must always be last, otherwise you get a horrible routing bug that I got burned on :(!!!*/
    return (
      <Provider store={this.props.store}>
        <BrowserRouter>
          <div id="container-wrapper">
            <div className="titlebar" />
            <Navbar />
            <div className="main-container">
              <Switch>
                <Route component={Tasks} path="/tasks" />
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
