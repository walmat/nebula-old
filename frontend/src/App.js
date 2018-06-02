import React, { Component } from 'react';
import {BrowserRouter, Route, Switch, Redirect} from 'react-router-dom';
import Navbar from './navbar/Navbar';
import Tasks from './tasks/Tasks';
import Profiles from './profiles/Profiles';
import Server from './server/Server';
import Settings from './settings/Settings';
import Auth from './auth/Auth';

import './App.css';

const authURL = `https://discordapp.com/oauth2/authorize?client_id=${REACT_APP_DISCORD_ID}&scope=identify&response_type=code&redirect_uri=${redirect}`;
const REACT_APP_DISCORD_ID = process.env.REACT_APP_DISCORD_ID;
const REACT_APP_DISCORD_SECRET = process.env.REACT_APP_DISCORD_SECRET;
const redirect = 'http://localhost:3000/auth';

class App extends Component {
    render() {
        return (
            <BrowserRouter>
                <div id="container-wrapper">
                    <div className="titlebar" />
                    <Navbar />
                    <div className="main-container">
                        <Switch>
                            <Route path='/login' component={() => window.location = authURL}/>
                            <Route component={Tasks} path='/tasks' />
                            <Route component={Profiles} path='/profiles' />
                            <Route component={Server} path='/server'/>
                            <Route component={Settings} path='/settings'/>
                            <Route component={Auth} path='/auth' />
                            <Route path='/'>
                                <Redirect to='/tasks' />
                            </Route>
                        </Switch>
                    </div>
                </div>
            </BrowserRouter>
        );
    }
}

export default App;
