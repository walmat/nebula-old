import React, { Component } from 'react';
import {BrowserRouter, Route, Switch, Redirect} from 'react-router-dom';
import Tasks from './tasks/Tasks';
import Sidebar from './sidebar/Sidebar';
import './App.css';
import Profiles from './profiles/Profiles';
import Proxies from './proxies/Proxies';
import Server from './server/Server';
import Settings from './settings/Settings';

class App extends Component {
  render() {
    return (
      <BrowserRouter>
        <div className="App">
          <Sidebar />

          <Switch>
            <Route component={Tasks} path='/tasks' />
            <Route component={Profiles} path='/profiles' />
            <Route component={Proxies} path='/proxies' />
            <Route component={Server} path='/server'/>
            <Route component={Settings} path='/settings'/>
            <Route path='/'>
              <Redirect to='/tasks' />
            </Route>
          </Switch>
        </div>
      </BrowserRouter>
    );
  }
}

export default App;
