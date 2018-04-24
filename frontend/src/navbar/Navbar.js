import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
import logo from '../_assets/logo.svg';
import tasks from '../_assets/tasks.svg';
import profiles from '../_assets/profiles.svg';
import server from '../_assets/server.svg';
import settings from '../_assets/settings.svg';
import user from '../_assets/user.svg';
import help from '../_assets/help.svg'
import logout from '../_assets/logout.svg'

class Navbar extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    render() {
        return (
            <div className="nav">
                <img src={logo} className="App-logo" alt="logo" draggable="false" />
                <img src={tasks} className="App-icon-first" alt="tasks" onClick={() => this.props.history.push('/')} draggable="false"/>
                <img src={profiles} className="App-icons" alt="profiles" onClick={() => this.props.history.push('/profiles')} draggable="false"/>
                <img src={server} className="App-icons" alt="server" onClick={() => this.props.history.push('/server')} draggable="false"/>
                <img src={settings} className="App-icons" alt="settings" onClick={() => this.props.history.push('/settings')} draggable="false"/>
                <div className="BottomIcons">
                    <img src={user} className="App-icons-btm" alt="user" draggable="false" />
                    <img src={help} className="App-icons-btm" alt="help" draggable="false" />
                    <a><img src={logout} className="App-icons-btm" alt="logout" draggable="false" /></a>
                </div>
            </div>
        );
    }
}

Navbar.propTypes = {
    history: PropTypes.object
};

export default withRouter(Navbar);
