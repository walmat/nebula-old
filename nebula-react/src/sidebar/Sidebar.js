import React, { Component } from 'react';
import logo from '../_assets/logo.svg';
import tasks from '../_assets/tasks.svg';
import profiles from '../_assets/profiles.svg';
import proxies from '../_assets/proxies.svg';
import server from '../_assets/server.svg';
import settings from '../_assets/settings.svg';
import user from '../_assets/user.svg';
import help from '../_assets/help.svg'
import logout from '../_assets/logout.svg'

import './Sidebar.css';

class Sidebar extends Component {
    render() {
        return (
            <div className="Sidebar">
                <img src={logo} className="App-logo" alt="logo" />
                <img src={tasks} className="App-icon-first" alt="tasks" />
                <img src={profiles} className="App-icons" alt="profiles" />
                <img src={proxies} className="App-icons" alt="proxies" />
                <img src={server} className="App-icons" alt="server" />
                <img src={settings} className="App-icons" alt="settings" />
                <div className="BottomIcons">
                    <img src={user} className="App-icons-btm" alt="user" />
                    <img src={help} className="App-icons-btm" alt="help" />
                    <a><img src={logout} className="App-icons-btm" alt="logout" /></a>
                </div>
            </div>
        );
    }
}

export default Sidebar;
