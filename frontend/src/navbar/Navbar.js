import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
import logo from '../_assets/logo.svg';
import tasks from '../_assets/tasks.svg';
import profiles from '../_assets/profiles.svg';
import server from '../_assets/server.svg';
import settings from '../_assets/settings.svg';
import tasksActive from '../_assets/tasks-active.svg';
import profilesActive from '../_assets/profiles-active.svg';
import serverActive from '../_assets/server-active.svg';
import settingsActive from '../_assets/settings-active.svg';
import logout from '../_assets/logout.svg'
import info from '../_assets/info-bot.svg';
import deactivate from '../_assets/Pause_Bot_icon-01.svg';

import './Navbar.css';

class Navbar extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    changeActive(active) {
        let tasksIcon = document.getElementById('icon-tasks');
        let profilesIcon = document.getElementById('icon-profiles');
        let serverIcon = document.getElementById('icon-server');
        let settingsIcon = document.getElementById('icon-settings');

        if (active === 'icon-tasks') {
            tasksIcon.src = tasksActive;
            profilesIcon.src = profiles;
            serverIcon.src = server;
            settingsIcon.src = settings;
        } else if (active === 'icon-profiles') {
            tasksIcon.src = tasks;
            profilesIcon.src = profilesActive;
            serverIcon.src = server;
            settingsIcon.src = settings;
        } else if (active === 'icon-server') {
            tasksIcon.src = tasks;
            profilesIcon.src = profiles;
            serverIcon.src = serverActive;
            settingsIcon.src = settings;
        } else if (active === 'icon-settings') {
            tasksIcon.src = tasks;
            profilesIcon.src = profiles;
            serverIcon.src = server;
            settingsIcon.src = settingsActive;
        }
    }

    render() {
        return (
            <div className="nav-container">
                <div className="flex-column">
                    <img src={logo} id="App-logo" alt="logo" draggable="false" />
                    <div id="vert-line" />
                    <img src={tasksActive} className="main-icons" id="icon-tasks" alt="tasks" onClick={() => {
                        this.props.history.push('/');
                        this.changeActive('icon-tasks');
                    }} draggable="false"/>
                    <img src={profiles} className="main-icons" id="icon-profiles" alt="profiles" onClick={() => {
                        this.props.history.push('/profiles');
                        this.changeActive('icon-profiles');
                    }} draggable="false"/>
                    <img src={server} className="main-icons" id="icon-server" alt="server" onClick={() => {
                        this.props.history.push('/server');
                        this.changeActive('icon-server');
                    }} draggable="false"/>
                    <img src={settings} className="main-icons" id="icon-settings" alt="settings" onClick={() => {
                        this.props.history.push('/settings');
                        this.changeActive('icon-settings');
                    }} draggable="false"/>
                    <img src={info} id="icon-information" alt="information" draggable="false" />
                    <img src={logout} id="icon-deactivate" alt="logout" draggable="false" />
                    <img src={deactivate} id="icon-logout" alt="deactivate" draggable="false" />

                </div>
            </div>
        );
    }
}

Navbar.propTypes = {
    history: PropTypes.object
};

export default withRouter(Navbar);
