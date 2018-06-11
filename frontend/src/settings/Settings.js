import React, { Component } from 'react';

import save from '../_assets/save.svg';
import checkboxChecked from '../_assets/Check_icons-01.svg';
import checkboxUnchecked from '../_assets/Check_icons-02.svg';

import '../App.css';
import './Settings.css';
import {SETTINGS_FIELDS, settingsActions} from "../state/Actions";
import {connect} from "react-redux";

/* global require */
const electron = window.require('electron');
const ipcRenderer = electron.ipcRenderer;


class Settings extends Component {

    constructor(props) {
        super(props);
        this.state = {
            settings:[]
        };
    }

    /*
    * Launch a new browser window that opens a sign-in google window
    * and then redirects to youtube.
    */
    launchYoutube = async () => {
        // let youtube = new BrowserWindow({
        //     width: 400,
        //     height: 600,
        //     center: true,
        //     frame: true,
        //     fullscreenable: false,
        //     movable: true,
        //     resizable: false,
        //     webPreferences: {
        //         nodeIntegration: false,
        //         preload: 'preload.js'
        //     }
        // });
        // youtube.loadURL('http://youtube.com');
        //
        // // Emitted when the window is closed.
        // youtube.on('closed', function () {
        //     // Dereference the window object, usually you would store windows
        //     // in an array if your app supports multi windows, this is the time
        //     // when you should delete the corresponding element.
        //     youtube = null
        // })

        ipcRenderer.send('window-event', 'launchYoutube');
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
                <textarea id="proxy-list-text" />
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
        currentSettings: state.proxies
    }
};

const mapDispatchToProps = (dispatch) => {
    return {
        saveProxies: () => {
            dispatch(settingsActions.edit(null, SETTINGS_FIELDS.EDIT_PROXIES));
        }
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(Settings);
