import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
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
import logoAnimation from './nebula';
import './Navbar.css';

import Bodymovin from './Bodymovin';

const bodymovinOptions = {
    loop: true,
    autoplay: true,
    prerender: true,
    animationData: logoAnimation,
    rendererSettings: {
        progressiveLoad:false,
        preserveAspectRatio: 'xMidYMid slice'
    }
}

class Navbar extends Component {

    constructor(props) {
        super(props);

        this.closeBot = this.closeBot.bind(this);
        this.deactivate = this.deactivate.bind(this);
    }

    componentDidMount = async () => {
    }

    /**
     * send the 'close' signal to the bot
     * ### this will not de-authenticate the user!!!!
     * AKA:: they won't see the auth screen upon next launch
     */
    closeBot = () => {

    };

    /**
     * send the 'deactivate' signal to the bot.
     * The user will need to authenticate their license key again,
     * so the next time they launch the bot they will see the auth screen
     *
     * Also, this should clear the database of ALL traces of their data
     * except from the 'users' table
     */
    deactivate = () => {

    };

    launchInfo = async () => {

    };

    changeActive = (active) => {
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
    };

    render() {
        return (
            <div className="nav-container">
                <div className="flex-column">
                    <Bodymovin options={bodymovinOptions} />
                    {/*<img src={logo} id="App-logo" draggable="false" />*/}
                    <div id="vert-line" />
                    <img src={tasksActive} className="main-icons" id="icon-tasks" alt="tasks" onClick={() => {
                        this.changeActive('icon-tasks');
                        return this.props.history.push('/');
                    }} draggable="false"/>
                    <img src={profiles} className="main-icons" id="icon-profiles" alt="profiles" onClick={() => {
                        this.changeActive('icon-profiles');
                        return this.props.history.push('/profiles');
                    }} draggable="false"/>
                    <img src={server} className="main-icons" id="icon-server" alt="server" onClick={() => {
                        this.changeActive('icon-server');
                        return this.props.history.push('/server');
                    }} draggable="false"/>
                    <img src={settings} className="main-icons" id="icon-settings" alt="settings" onClick={() => {
                        this.changeActive('icon-settings');
                        return this.props.history.push('/settings');
                    }} draggable="false"/>
                    <img src={info} id="icon-information" alt="information" draggable="false" onClick={this.launchInfo} />
                    <img src={logout} id="icon-deactivate" alt="logout" draggable="false" onClick={this.closeBot} />
                    <img src={deactivate} id="icon-logout" alt="deactivate" draggable="false" onClick={this.deactivate} />
                </div>
            </div>
        );
    }
}

Navbar.propTypes = {
    history: PropTypes.object
};

export default withRouter(Navbar);
