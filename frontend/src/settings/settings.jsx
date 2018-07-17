import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import EnsureAuthorization from '../EnsureAuthorization';


import save from '../_assets/save.svg';
// import checkboxChecked from '../_assets/Check_icons-01.svg';
// import checkboxUnchecked from '../_assets/Check_icons-02.svg';

import '../app.css';
import './settings.css';
import { SETTINGS_FIELDS, settingsActions } from '../state/actions';

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
    this.editProxies = this.editProxies.bind(this);
    this.displayProxies = this.displayProxies.bind(this);
    this.saveProxies = this.saveProxies.bind(this);
  }

  editProxies(e) {
    e.preventDefault();
    const proxyListStr = e.target.value;
    const proxiesStr = proxyListStr.trim();
    const proxies = proxiesStr.split('\n').map((proxyLine) => {
      const firstColon = proxyLine.indexOf(':');
      // Check if first ":" is in the first 7 characters
      // This is used to check if we are correctly removing the index portion "x: "
      // rather than the first colon of the ipaddress, "0.0.0.0:" being the minimum
      // length for the ip address (which puts the colon at index 7).
      if (firstColon < 7) {
        return proxyLine.padEnd(7, ' ').substring(firstColon + 1).trim();
      }
      return proxyLine.trim();
    });
    // add an empty proxy to force a newline on rerender...
    if (proxyListStr.endsWith('\n')) {
      proxies.push('');
    }
    let testStr = proxyListStr.trim();
    testStr = testStr.substring(testStr.lastIndexOf('\n') + 1);
    const colon = testStr.indexOf(':');
    if (colon > 0 &&
        colon === testStr.lastIndexOf(':') &&
        testStr.substring(colon + 1).trim() === '') {
      proxies.pop();
    }
    this.props.onEditProxies(proxies);
  }

  displayProxies() {
    return this.props.proxies.reduce((accum, proxy, idx) => `${accum}${accum === '' ? '' : '\n'}${idx + 1}: ${proxy}`, '');
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
        <textarea id="proxy-list-text" value={this.displayProxies()} onChange={this.editProxies} />
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
  onEditProxies: PropTypes.func.isRequired,
  onSaveProxies: PropTypes.func.isRequired,
  proxies: PropTypes.arrayOf(PropTypes.any).isRequired,
};

const mapStateToProps = state => ({
  proxies: state.settings.proxies,
});

const mapDispatchToProps = dispatch => ({
  onEditProxies: (data) => {
    dispatch(settingsActions.edit(SETTINGS_FIELDS.EDIT_PROXIES, data));
  },
  onSaveProxies: (proxies) => {
    console.log('TODO: save proxies');
  },
});

export default EnsureAuthorization(connect(mapStateToProps, mapDispatchToProps)(Settings));
