import React, { Component } from 'react';
import Select, { components } from 'react-select';
import { connect } from 'react-redux';
import EnsureAuthorization from '../EnsureAuthorization';

import '../app.css';
import './settings.css';
import ProxyList from './proxyList';
import DDD from '../_assets/dropdown-down.svg';
import DDU from '../_assets/dropdown-up.svg';

import defns from '../utils/definitions/settingsDefinitions';
import getAllSizes from '../getSizes';

// change this based on whether it's open or not {{toggle between DDU & DDD}}
const DropdownIndicator = (props) => {
  return components.DropdownIndicator && (
    <components.DropdownIndicator {...props}>
      <img src={props.menuIsOpen ? DDU : DDD} style={{ marginRight: '-5px', cursor: 'pointer' }} alt="" />
    </components.DropdownIndicator>
  );
};

const colourStyles = {
  control: styles => ({
    ...styles,
    backgroundColor: '#f4f4f4',
    height: '29px',
    minHeight: '29px',
    border: '1px solid #F0405E',
    borderRadius: '3px',
    outline: 'none',
    cursor: 'pointer',
    boxShadow: 'none',
  }),
  option: (styles, { isDisabled, isFocused, isSelected }) => {
    return {
      ...styles,
      backgroundColor: isFocused ? '#f4f4f4' : isDisabled ? '#ccc' : isSelected ? '#ccc' : '#fff',
      color: '#161318',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      outline: 'none',
      boxShadow: 'none',
    };
  },
  // fix this? doesn't work for some reason..
  DropdownIndicator: (styles, { menuIsOpen }) => {
    return {
      ...styles,
      marginRight: '-5px',
      src: menuIsOpen ? DDU : DDD,
    };
  },
  // input: styles => ({ ...styles, ...dot() }),
  // placeholder: styles => ({ ...styles, ...dot() }),
  // singleValue: (styles, { data }) => ({ ...styles, ...dot('#f4f4f4') }),
};


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
