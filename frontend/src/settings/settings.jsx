import React, { Component } from 'react';
import Select from 'react-select';
import { connect } from 'react-redux';
import EnsureAuthorization from '../EnsureAuthorization';

import '../app.css';
import './settings.css';
import ProxyList from './proxyList';
import { DropdownIndicator, colourStyles } from '../utils/styles/select';
import defns from '../utils/definitions/settingsDefinitions';
import getAllSizes from '../getSizes';

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

  static buildSizeOptions() {
    return getAllSizes();
  }

  buildProfileOptions() {
    const { profiles } = this.props;
    const opts = [];
    profiles.forEach(profile => {
      opts.push({ value: profile.id, label: profile.profileName })
    });
    return opts;
  }

  render() {
    return (
      <div className="container">
        <h1 className="text-header" id="task-header">Settings</h1>
        {/* LOGIN */}
        <p className="body-text" id="proxy-list-label">Proxy List</p>
        <div id="proxy-list-box" />
        <ProxyList id="proxy-list-text" />
        <button id="proxy-button-youtube" onClick={Settings.launchYoutube} >YouTube</button>
        <button id="proxy-button-captcha" onClick={Settings.harvester} >Captcha</button>
        <button id="proxy-button-close-session" onClick={Settings.closeSession} >End Session</button>

        {/* EXTRAS */}
        <p id="discord-label">Discord URL</p>
        <input id="discord-input" placeholder="https://discordapp.com/api/webhooks/..." />
        <p id="slack-label">Slack URL</p>
        <input id="slack-input" placeholder="https://hooks.slack.com/services/..." />

        {/* DEFAULTS */}
        <p className="body-text" id="defaults-label">Defaults</p>
        <div id="defaults-box" />
        <p id="default-profile-label">Profile</p>
        <Select
          required
          defaultValue="Choose Profile"
          components={{ DropdownIndicator }}
          id="default-profile"
          classNamePrefix="select"
          styles={colourStyles}
          onChange={this.onProfileChange}
          value={this.props.selectedProfile.value}
          options={this.buildProfileOptions()}
        />

        <p id="default-sizes-label">Sizes</p>
        <Select
          required
          defaultValue="Choose Sizes"
          components={{ DropdownIndicator }}
          id="default-sizes"
          classNamePrefix="select"
          styles={colourStyles}
          onChange={this.onProfileChange}
          value={this.props.selectedProfile.value}
          options={Settings.buildSizeOptions()}
        />
        <button
          id="save-defaults"
          tabIndex={0}
          onKeyPress={() => {}}
          onClick={this.saveDefaults}
        >
        Save
        </button>

        <button
          id="clear-defaults"
          tabIndex={0}
          onKeyPress={() => {}}
          onClick={this.saveDefaults}
        >
        Clear
        </button>
      </div>
    );
  }
}

Settings.propTypes = {
  profiles: defns.profileList.isRequired,
  defaultProfile: defns.profile.isRequired,
};

const mapStateToProps = state => ({
  profiles: state.profiles,
  selectedProfile: state.selectedProfile,
});

const mapDispatchToProps = dispatch => ({
});

export default EnsureAuthorization(connect(mapStateToProps, mapDispatchToProps)(Settings));
