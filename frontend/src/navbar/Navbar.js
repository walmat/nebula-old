import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
import logo from '../_assets/logo.svg';
import tasks from '../_assets/tasks.svg';
import profiles from '../_assets/profiles.svg';
import server from '../_assets/server.svg';
import settings from '../_assets/settings.svg';
import logout from '../_assets/logout.svg'
import vertline from '../_assets/vert-line.svg'

import './Navbar.css';

class Navbar extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    render() {
        return (
            <div className="nav-container">
                <div className="flex-column">
                    <img src={logo} id="App-logo" alt="logo" draggable="false" />
                    <div id="vert-line"></div>
                    <img src={tasks} id="icon-tasks" alt="tasks" onClick={() => this.props.history.push('/')} draggable="false"/>
                    <img src={profiles} id="icon-profiles" alt="profiles" onClick={() => this.props.history.push('/profiles')} draggable="false"/>
                    <img src={server} id="icon-server" alt="server" onClick={() => this.props.history.push('/server')} draggable="false"/>
                    <img src={settings} id="icon-settings" alt="settings" onClick={() => this.props.history.push('/settings')} draggable="false"/>
                    <img src={logout} id="icon-logout" alt="logout" draggable="false" />
                </div>
            </div>
        );
    }
}

Navbar.propTypes = {
    history: PropTypes.object
};

export default withRouter(Navbar);
