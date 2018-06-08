import React, { Component } from 'react';

import save from '../_assets/save.svg';
import checkboxChecked from '../_assets/Check_icons-01.svg';
import checkboxUnchecked from '../_assets/Check_icons-02.svg';

import '../App.css';
import './Settings.css';
import {profileActions, SETTINGS_FIELDS, settingsActions} from "../state/Actions";
import {connect} from "react-redux";


class Settings extends Component {

    constructor(props) {
        super(props);
    }

    saveProxies = async (e) => {
        // saves input data to user's profiles
        e.preventDefault();

        this.props.onSaveProxies(this.props.settings.proxies);
    };

    /*
    * Launch a new browser window that opens a sign-in google window
    * and then redirects to youtube.
    */
    launchYoutube = async () => {

    };

    /*
    * Launch a sub-window with built in AI for image recognition
    * and capabilities of one-click harvesting
    */
    harvester = async () => {

    };

    /*
    * Signs current google user out. Will clear cookies as well
    */
    closeSession = async () => {

    };

    render() {
        return (
            <div className="container">
                <h1 className="text-header" id="task-header">Settings</h1>
                {/*LOGIN*/}
                <p className="body-text" id="proxy-list-label">Proxy List</p>
                <div id="proxy-list-box" />
                <textarea id="proxy-list-text" onChange={this.props.onProxiesChange} placeholder="IP:PORT:USER:PASS&#10;IP:PORT:USER:PASS&#10;IP:PORT:USER:PASS&#10;IP:PORT:USER:PASS&#10;IP:PORT:USER:PASS&#10;IP:PORT:USER:PASS&#10;IP:PORT:USER:PASS&#10;IP:PORT:USER:PASS&#10;IP:PORT:USER:PASS&#10;IP:PORT:USER:PASS&#10;IP:PORT:USER:PASS&#10;IP:PORT:USER:PASS&#10;IP:PORT:USER:PASS&#10;IP:PORT:USER:PASS&#10;IP:PORT:USER:PASS&#10;IP:PORT:USER:PASS&#10;IP:PORT:USER:PASS&#10;IP:PORT:USER:PASS" />
                <img src={save} onClick={this.props.saveProxies} id="proxy-list-save" draggable="false"/>
                <button id="proxy-button-youtube" onClick={this.launchYoutube} >YouTube</button>
                <button id="proxy-button-captcha" onClick={this.harvester} >Captcha</button>
                <button id="proxy-button-close-session" onClick={this.closeSession} >End Session</button>
            </div>
        );
    }
}

const mapStateToProps = (state) => {
    return {
        currentSettings: state.settings
    }
};

const mapDispatchToProps = (dispatch) => {
    return {
        onProxiesChange: (event) => {
            dispatch(settingsActions.edit(null, SETTINGS_FIELDS.EDIT_PROXIES, event.target.value));
        },
        onSaveProxies: (proxies) => {
            dispatch(profileActions.add(proxies));
        }
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(Settings);
