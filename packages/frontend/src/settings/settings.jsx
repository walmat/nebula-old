import React, { Component } from 'react';
import Select from 'react-select';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import NumberFormat from 'react-number-format';
import '../app.css';
import './settings.css';
import ProxyList from './proxyList';
import { DropdownIndicator, colourStyles } from '../utils/styles/select';
import pDefns from '../utils/definitions/profileDefinitions';
import sDefns from '../utils/definitions/settingsDefinitions';
import getAllSizes from '../constants/getAllSizes';
import {
  settingsActions,
  mapSettingsFieldToKey,
  SETTINGS_FIELDS,
} from '../state/actions';
import { buildStyle } from '../utils/styles';

export class SettingsPrimitive extends Component {
  /*
   * Launch a sub-window with built in AI for image recognition
   * and capabilities of one-click harvesting
   */
  static harvester() {
    if (window.Bridge) {
      window.Bridge.launchCaptchaHarvester();
    } else {
      // TODO - error handling
      console.error('Unable to launch harvester!');
    }
  }

  /*
   * Signs current google user out. Will clear cookies as well
   */
  static closeAllCaptchaWindows() {
    if (window.Bridge) {
      window.Bridge.closeAllCaptchaWindows();
    } else {
      // TODO - error handling
      console.error('Unable to close all windows');
    }
  }

  static buildSizeOptions() {
    return getAllSizes();
  }

  buildProfileOptions() {
    const { profiles } = this.props;
    const opts = [];
    profiles.forEach(profile => {
      opts.push({ value: profile.id, label: profile.profileName });
    });
    return opts;
  }

  createOnChangeHandler(field) {
    const { profiles, onSettingsChange } = this.props;
    switch (field) {
      case SETTINGS_FIELDS.EDIT_DEFAULT_PROFILE:
        return event => {
          const change = profiles.find(p => p.id === event.value);
          onSettingsChange({ field, value: change });
        };
      case SETTINGS_FIELDS.EDIT_DEFAULT_SIZES:
        return event => {
          onSettingsChange({ field, value: event });
        };
      default:
        return event => {
          onSettingsChange({
            field,
            value: event.target.value,
          });
        };
    }
  }

  render() {
    const {
      errors,
      settings,
      onKeyPress,
      onSaveDefaults,
      onClearDefaults,
    } = this.props;
    let defaultProfileValue = null;
    if (settings.defaults.profile.id !== null) {
      defaultProfileValue = {
        value: settings.defaults.profile.id,
        label: settings.defaults.profile.profileName,
      };
    }
    return (
      <div className="container">
        <h1 className="text-header" id="setting-header">
          Settings
        </h1>

        {/* Proxy List */}
        <p className="body-text" id="proxy-list-label">
          Proxy List
        </p>
        <div id="proxy-list-box" />
        <ProxyList id="proxy-list-text" />

        {/* CAPTCHA Window */}
        {/* <button type="button" id="proxy-button-youtube" onClick={SettingsPrimitive.launchYoutube} >YouTube</button> */}
        <button
          type="button"
          id="proxy-button-captcha"
          onClick={SettingsPrimitive.harvester}
        >
          Captcha Window
        </button>
        <button
          type="button"
          id="proxy-button-captcha-close"
          onClick={SettingsPrimitive.closeAllCaptchaWindows}
        >
          Close All Windows
        </button>

        {/* EXTRAS */}
        <p id="discord-label">Discord URL</p>
        <input
          id="discord-input"
          placeholder="https://discordapp.com/api/webhooks/..."
          onChange={this.createOnChangeHandler(SETTINGS_FIELDS.EDIT_DISCORD)}
          style={buildStyle(
            false,
            errors[mapSettingsFieldToKey[SETTINGS_FIELDS.EDIT_DISCORD]]
          )}
          value={settings.discord}
        />
        <p id="slack-label">Slack URL</p>
        <input
          id="slack-input"
          placeholder="https://hooks.slack.com/services/..."
          onChange={this.createOnChangeHandler(SETTINGS_FIELDS.EDIT_SLACK)}
          style={buildStyle(
            false,
            errors[mapSettingsFieldToKey[SETTINGS_FIELDS.EDIT_SLACK]]
          )}
          value={settings.slack}
        />

        {/* DEFAULTS */}
        <p className="body-text" id="defaults-label">
          Defaults
        </p>
        <div id="defaults-box" />
        <p id="default-profile-label">Profile</p>
        <Select
          required
          placeholder="Choose Profile"
          components={{ DropdownIndicator }}
          id="default-profile"
          classNamePrefix="select"
          styles={colourStyles(
            buildStyle(
              false,
              errors[
                mapSettingsFieldToKey[SETTINGS_FIELDS.EDIT_DEFAULT_PROFILE]
              ]
            )
          )}
          onChange={this.createOnChangeHandler(
            SETTINGS_FIELDS.EDIT_DEFAULT_PROFILE
          )}
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
          styles={colourStyles(
            buildStyle(
              false,
              errors[mapSettingsFieldToKey[SETTINGS_FIELDS.EDIT_DEFAULT_SIZES]]
            )
          )}
          onChange={this.createOnChangeHandler(
            SETTINGS_FIELDS.EDIT_DEFAULT_SIZES
          )}
          value={settings.defaults.sizes.map(size => ({
            value: size.value,
            label: size.label,
          }))}
          options={SettingsPrimitive.buildSizeOptions()}
        />
        <button
          type="button"
          id="save-defaults"
          tabIndex={0}
          onKeyPress={onKeyPress}
          onClick={() => {
            onSaveDefaults(settings.defaults);
          }}
        >
          Save
        </button>

        <button
          type="button"
          id="clear-defaults"
          tabIndex={0}
          onKeyPress={onKeyPress}
          onClick={() => {
            onClearDefaults(SETTINGS_FIELDS.CLEAR_DEFAULTS);
          }}
        >
          Clear
        </button>

        {/* Delays */}
        <p id="monitor-label">Monitor Delay</p>
        <NumberFormat
          value={settings.monitorDelay}
          placeholder="1500"
          id="monitor-input"
          style={buildStyle(
            false,
            errors[mapSettingsFieldToKey[SETTINGS_FIELDS.EDIT_MONITOR_DELAY]]
          )}
          onChange={this.createOnChangeHandler(
            SETTINGS_FIELDS.EDIT_MONITOR_DELAY
          )}
          required
        />

        <p id="error-label">Error Delay</p>
        <NumberFormat
          value={settings.errorDelay}
          placeholder="1500"
          id="error-input"
          style={buildStyle(
            false,
            errors[mapSettingsFieldToKey[SETTINGS_FIELDS.EDIT_ERROR_DELAY]]
          )}
          onChange={this.createOnChangeHandler(
            SETTINGS_FIELDS.EDIT_ERROR_DELAY
          )}
          required
        />
      </div>
    );
  }
}

SettingsPrimitive.propTypes = {
  onSettingsChange: PropTypes.func.isRequired,
  onSaveDefaults: PropTypes.func.isRequired,
  onClearDefaults: PropTypes.func.isRequired,
  onKeyPress: PropTypes.func,
  profiles: pDefns.profileList.isRequired,
  settings: sDefns.settings.isRequired,
  errors: sDefns.settingsErrors.isRequired,
};

SettingsPrimitive.defaultProps = {
  onKeyPress: () => {},
};

export const mapStateToProps = state => ({
  profiles: state.profiles,
  settings: state.settings,
  errors: state.settings.errors,
});

export const mapDispatchToProps = dispatch => ({
  onSettingsChange: changes => {
    dispatch(settingsActions.edit(changes.field, changes.value));
  },
  onSaveDefaults: defaults => {
    dispatch(settingsActions.save(defaults));
  },
  onClearDefaults: changes => {
    dispatch(settingsActions.clear(changes));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SettingsPrimitive);
