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
    this.proxyChangeHandler = this.proxyChangeHandler.bind(this);
    this.proxyKeyDownHandler = this.proxyKeyDownHandler.bind(this);

    // TEMPORARY
    this.useTextArea = true;
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

  proxyChangeHandler(idx) {
    return (e) => {
      const { proxies } = this.props;
      const proxyListStr = e.target.value;
      const proxyList = proxyListStr.trim().split(' ');
      if (proxies.length === 0) {
        console.log(proxyListStr);
        this.props.onEditProxies(proxyList);
      } else {
        console.log(proxyListStr);
        proxies.splice(idx, 1, proxyList);
        console.log('edit proxies');
        console.log(proxies);
        this.props.onEditProxies(proxies);
      }
    };
  }

  proxyKeyDownHandler(idx) {
    return (e) => {
      const { proxies } = this.props;
      if (e.key === 'Enter' || e.which === 13) {
        if (proxies.length !== 0) {
          proxies.splice(idx + 1, 0, '');
          this.props.onEditProxies(proxies);
        }
        return false;
      } else if (e.key === 'Backspace' || e.which === 8) {
        if (e.target.value !== '') {
          return true;
        }
        proxies.splice(idx, 1);
        this.props.onEditProxies(proxies);
        return false;
      }
      return true;
    };
  }

  renderProxies() {
    if (this.props.proxies.length === 0) {
      return (<input className="proxy-list-input" tabIndex={0} onChange={this.proxyChangeHandler(0)} onKeyDown={this.proxyKeyDownHandler(0)} key={0} value="" />);
    }
    return this.props.proxies.map((proxy, idx) =>
      (<input className="proxy-list-input" tabIndex={0} onChange={this.proxyChangeHandler(idx)} onKeyDown={this.proxyKeyDownHandler(idx)} key={idx} value={proxy} />));
  }

  renderProxyList() {
    if (this.useTextArea) {
      return (
        <textarea id="proxy-list-text" value={this.displayProxies()} onChange={this.editProxies} />
      );
    }
    return (
      <div id="proxy-list-text">
        {this.renderProxies()}
      </div>
    );
  }

  render() {
    return (
      <div className="container">
        <h1 className="text-header" id="task-header">Settings</h1>
        {/* LOGIN */}
        <p className="body-text" id="proxy-list-label">Proxy List</p>
        <div id="proxy-list-box" />
        {this.renderProxyList()}
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
