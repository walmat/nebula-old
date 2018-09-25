import React, { Component } from 'react';
import Select from 'react-select';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import '../app.css';
import './settings.css';
import ProxyList from './proxyList';
import { DropdownIndicator, colourStyles } from '../utils/styles/select';
import pDefns from '../utils/definitions/profileDefinitions';
import sDefns from '../utils/definitions/settingsDefinitions';
import getAllSizes from '../getSizes';
import { settingsActions, SETTINGS_FIELDS } from '../state/actions';

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

  constructor(props) {
    super(props);
    this.saveDefaults = this.saveDefaults.bind(this);
    this.clearDefaults = this.clearDefaults.bind(this);
  }

  buildProfileOptions() {
    const { profiles } = this.props;
    const opts = [];
    profiles.forEach(profile => {
      opts.push({ value: profile.id, label: profile.profileName })
    });
    return opts;
  }

  createOnChangeHandler(field) {
    switch (field) {
      case SETTINGS_FIELDS.EDIT_DEFAULT_PROFILE:
        return (event) => {
          const change = this.props.profiles.find(p => p.id === event.value);
          this.props.onSettingsChange({ field, value: change });
        };
      case SETTINGS_FIELDS.EDIT_DEFAULT_SIZES:
        return (event) => {
          this.props.onSettingsChange({ field, value: event });
        };
      case SETTINGS_FIELDS.EDIT_DISCORD:
      case SETTINGS_FIELDS.EDIT_SLACK:
        return (event) => {
          this.props.onSettingsChange({
            field,
            value: event.target.value,
          });
        };
      // should never be called, but just in case, treat it as a normal field input
      default:
        return (event) => {
          this.props.onSettingsChange({
            field,
            value: event.target.value,
          });
        };
    }
  }

  saveDefaults(e) {
    e.preventDefault();
    this.props.onSaveDefaults(
      SETTINGS_FIELDS.SAVE_DEFAULTS,
      this.props.defaultProfile,
      this.props.defaultSizes,
    );
  }

  clearDefaults(e) {
    e.preventDefault();
    this.props.onClearDefaults(SETTINGS_FIELDS.CLEAR_DEFAULTS);
  }

  render() {
    let defaultProfileValue = null;
    if (this.props.defaultProfile.id !== null) {
      defaultProfileValue = {
        value: this.props.defaultProfile.id,
        label: this.props.defaultProfile.profileName,
      };
    }
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
        <input
          id="discord-input"
          placeholder="https://discordapp.com/api/webhooks/..."
          onChange={this.createOnChangeHandler(SETTINGS_FIELDS.EDIT_DISCORD)}
          value={this.props.discord}
        />
        <p id="slack-label">Slack URL</p>
        <input
          id="slack-input"
          placeholder="https://hooks.slack.com/services/..."
          onChange={this.createOnChangeHandler(SETTINGS_FIELDS.EDIT_SLACK)}
          value={this.props.slack}
        />

        {/* DEFAULTS */}
        <p className="body-text" id="defaults-label">Defaults</p>
        <div id="defaults-box" />
        <p id="default-profile-label">Profile</p>
        <Select
          required
          placeholder="Choose Profile"
          components={{ DropdownIndicator }}
          id="default-profile"
          classNamePrefix="select"
          styles={colourStyles}
          onChange={this.createOnChangeHandler(SETTINGS_FIELDS.EDIT_DEFAULT_PROFILE)}
          value={defaultProfileValue}
          options={this.buildProfileOptions()}
        />

        <p id="default-sizes-label">Sizes</p>
        <Select
          required
          isMulti
          isClearable={false}
          placeholder="Choose Sizes"
          components={{ DropdownIndicator }}
          id="default-sizes"
          classNamePrefix="select"
          styles={colourStyles}
          onChange={this.createOnChangeHandler(SETTINGS_FIELDS.EDIT_DEFAULT_SIZES)}
          value={this.props.defaultSizes.map(size => ({ value: size.value, label: size.label }))}
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
          onClick={this.clearDefaults}
        >
        Clear
        </button>
      </div>
    );
  }
}

Settings.propTypes = {
  onSettingsChange: PropTypes.func.isRequired,
  onSaveDefaults: PropTypes.func.isRequired,
  onClearDefaults: PropTypes.func.isRequired,
  profiles: pDefns.profileList.isRequired,
  defaultProfile: sDefns.defaultProfile.isRequired,
  defaultSizes: sDefns.defaultSizes.isRequired,
  discord: sDefns.discord.isRequired,
  slack: sDefns.slack.isRequired,
};

const mapStateToProps = state => ({
  profiles: state.profiles,
  defaultProfile: state.settings.defaultProfile,
  defaultSizes: state.settings.defaultSizes,
  slack: state.settings.slack,
  discord: state.settings.discord,
});

const mapDispatchToProps = dispatch => ({
  onSettingsChange: (changes) => {
    dispatch(settingsActions.edit(
      changes.field,
      changes.value,
    ));
  },
  onSaveDefaults: (opt, defaultProfile, defaultSizes) => {
    dispatch(settingsActions.save({ defaultProfile, defaultSizes }));
  },
  onClearDefaults: (changes) => {
    dispatch(settingsActions.clear(changes));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(Settings);
