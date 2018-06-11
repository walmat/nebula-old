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

// const { REACT_APP_DISCORD_ID } = process.env;
// const redirect = 'http://localhost:3000/auth';
// const authURL = `https://discordapp.com/oauth2/authorize?client_id=${REACT_APP_DISCORD_ID}&scope=identify&response_type=code&redirect_uri=${redirect}`;

class App extends PureComponent {
  render() {
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
