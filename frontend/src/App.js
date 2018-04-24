import React, { Component } from 'react';
import {BrowserRouter, Route, Switch, Redirect} from 'react-router-dom';
import Navbar from './navbar/Navbar';
import Tasks from './tasks/Tasks';
import Profiles from './profiles/Profiles';
import Server from './server/Server';
import Settings from './settings/Settings';

import './App.css';
import './navbar/Navbar.css';

class App extends Component {
    render() {
        return (
            <BrowserRouter>
                <div id="container-wrapper">
                    <div className="titlebar"></div>
                    <Navbar />

                    <Switch>
                        <Route component={Tasks} path='/tasks' />
                        <Route component={Profiles} path='/profiles' />
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
