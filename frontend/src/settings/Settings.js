import React, { Component } from 'react';

import save from '../_assets/save.svg';

import './Settings.css';

class Settings extends Component {

    constructor(props) {
        super(props);
        this.state = {};
    }

    launchYoutube = async () => {

    };

    harvester = async () => {

    };

    closeSession = async () => {

    };

    render() {
        return (
            <div className="container">
                <h1 className="text-header" id="task-header">Settings</h1>
                {/*LOGIN*/}
                <p className="body-text" id="proxy-list-label">Proxy List</p>
                <div id="proxy-list-box" />
                <textarea id="proxy-list-text" />
                <img src={save} id="proxy-list-save" draggable="false"/>
                <button id="proxy-button-youtube" onClick={this.launchYoutube} >YouTube</button>
                <button id="proxy-button-captcha" onClick={this.harvester} >Captcha</button>
                <button id="proxy-button-close-session" onClick={this.closeSession} >End Session</button>

            </div>
        );
    }
}

export default Settings;