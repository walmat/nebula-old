import React, { Component } from 'react';
import {BrowserRouter, Route, Switch, Redirect} from 'react-router-dom';
import Tasks from './tasks/Tasks';
import Sidebar from './sidebar/Sidebar';
import './App.css';

class App extends Component {
  render() {
    return (
      <BrowserRouter>
        <div className="App">
          <Sidebar />

          <Switch>
            <Route component={Tasks} path='/Tasks' />
            <Route path='/'>
              <Redirect to='/Tasks' />
            </Route>
          </Switch>
        </div>
      </BrowserRouter>
    );
  }
}

export default App;
