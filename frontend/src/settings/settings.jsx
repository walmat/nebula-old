import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import EnsureAuthorization from '../EnsureAuthorization';


import save from '../_assets/save.svg';
// import checkboxChecked from '../_assets/Check_icons-01.svg';
// import checkboxUnchecked from '../_assets/Check_icons-02.svg';

import '../app.css';
import './settings.css';
import ProxyList from './proxyList';
import defns from '../utils/definitions/settingsDefinitions';

class Settings extends Component {
  /*
  * Launch a new browser window that opens a sign-in google window
  * and then redirects to youtube.
  */
  static async launchYoutube() {
    if (window.Bridge) {
      window.Bridge.launchYoutube();
    } else {
      console.error('Unable to launch youtube!');
    }
  }

  /*
    * Launch a sub-window with built in AI for image recognition
    * and capabilities of one-click harvesting
    */
  static async harvester() {
    if (window.Bridge) {
      window.Bridge.launchHarvester();
    } else {
      // TODO - error handling
      console.error('Unable to launch harvester!');
    }
  }

  /*
    * Signs current google user out. Will clear cookies as well
    */
  static async closeSession() {
    if (window.Bridge) {
      window.Bridge.endSession();
      console.log('session ended');
    } else {
      // TODO - error handling
      console.error('Unable to end current session');
    }
  }

  constructor(props) {
    super(props);
    this.saveProxies = this.saveProxies.bind(this);
  }

  saveProxies(e) {
    e.preventDefault();
    this.props.onSaveProxies(this.props.proxies);
  }

  render() {
    return (
      <div className="container">
        <h1 className="text-header" id="task-header">Settings</h1>
        {/* LOGIN */}
        <p className="body-text" id="proxy-list-label">Proxy List</p>
        <div id="proxy-list-box" />
        <ProxyList id="proxy-list-text" />
        <div
          role="button"
          tabIndex={0}
          onKeyPress={() => {}}
          onClick={this.saveProxies}
        >
          <img src={save} alt="save proxy" id="proxy-list-save" draggable="false" />
        </div>
        <button id="proxy-button-youtube" onClick={Settings.launchYoutube} >YouTube</button>
        <button id="proxy-button-captcha" onClick={Settings.harvester} >Captcha</button>
        <button id="proxy-button-close-session" onClick={Settings.closeSession} >End Session</button>
      </div>
    );
  }
}

Settings.propTypes = {
  proxies: defns.proxies.isRequired,
  onSaveProxies: PropTypes.func.isRequired,
};

const mapStateToProps = state => ({
  proxies: state.settings.proxies,
});

const mapDispatchToProps = dispatch => ({
  onSaveProxies: (proxies) => {
    console.log('TODO: If necessary save proxies?');
  },
});

export default EnsureAuthorization(connect(mapStateToProps, mapDispatchToProps)(Settings));
