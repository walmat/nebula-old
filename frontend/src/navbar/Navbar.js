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

/* global require */
const electron = window.require('electron');
const ipcRenderer = electron.ipcRenderer;

// const bodymovinOptions = {
//     loop: true,
//     autoplay: true,
//     prerender: true,
//     animationData: logoAnimation
// }


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

        this.state = {
            icons: {
                tasksIcon: tasks,
                profilesIcon: profiles,
                serverIcon: server,
                settingsIcon: settings
            }
        }

        this.closeBot = this.closeBot.bind(this);
        this.deactivate = this.deactivate.bind(this);
    }

    componentDidMount = () => {
        this.updateIcons();
    }

    /**
     * send the 'close' signal to the bot
     * ### this will not de-authenticate the user!!!!
     * AKA:: they won't see the auth screen upon next launch
     */
    closeBot = async () => {
        //TODO - close ALL windows..
        ipcRenderer.send('window-event', 'quit');
    };

    /**
     * send the 'deactivate' signal to the bot.
     * The user will need to authenticate their license key again,
     * so the next time they launch the bot they will see the auth screen
     *
     * Also, this should clear the database of ALL traces of their data
     * except from the 'users' table
     */
    deactivate = async () => {
        //TODO – de-auth user and show auth screen upon next launch
    };

    launchInfo = async () => {
        // window.open("http://bot-nebula.herokuapp.com");
        //TODO – launch a child window to website
    };

    updateIcons() {
        let currentLocation = this.props.history.location.pathname;
        let icons = this.state.icons;
        if (currentLocation === '/' || currentLocation === '/tasks') {
            icons.tasksIcon = tasksActive;
            icons.profilesIcon = profiles;
            icons.serverIcon = server;
            icons.settingsIcon = settings;
        } else if (currentLocation === '/profiles') {
            icons.tasksIcon = tasks;
            icons.profilesIcon = profilesActive;
            icons.serverIcon = server;
            icons.settingsIcon = settings;
        } else if (currentLocation === '/server') {
            icons.tasksIcon = tasks;
            icons.profilesIcon = profiles;
            icons.serverIcon = serverActive;
            icons.settingsIcon = settings;
        } else if (currentLocation === '/settings') {
            icons.tasksIcon = tasks;
            icons.profilesIcon = profiles;
            icons.serverIcon = server;
            icons.settingsIcon = settingsActive;
        }
        this.setState({icons});
    }

    render() {
        let icons = this.state.icons;
        return (
            <div className="nav-container">
                <div className="flex-column">
                    <Bodymovin options={bodymovinOptions} />
                    <div id="vert-line" />
                    <img src={icons.tasksIcon} className="main-icons" id="icon-tasks" alt="tasks" onClick={() => {
                        this.props.history.push('/');
                        this.updateIcons();
                    }} draggable="false"/>
                    <img src={icons.profilesIcon} className="main-icons" id="icon-profiles" alt="profiles" onClick={() => {
                        this.props.history.push('/profiles');
                        this.updateIcons();
                    }} draggable="false"/>
                    <img src={icons.serverIcon} className="main-icons" id="icon-server" alt="server" onClick={() => {
                        this.props.history.push('/server');
                        this.updateIcons();
                    }} draggable="false"/>
                    <img src={icons.settingsIcon} className="main-icons" id="icon-settings" alt="settings" onClick={() => {
                        this.props.history.push('/settings');
                        this.updateIcons();
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
