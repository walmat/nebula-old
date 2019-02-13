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
import { settingsActions, mapSettingsFieldToKey, SETTINGS_FIELDS } from '../state/actions';
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
          onSettingsChange({ field, value: event.map(s => s.value) });
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
      onTestDiscord,
      onTestSlack,
    } = this.props;
    const defaultSizes = settings.defaults.sizes.map(s => ({ value: s, label: `${s}` }));
    let defaultProfileValue = null;
    if (settings.defaults.profile.id !== null) {
      defaultProfileValue = {
        value: settings.defaults.profile.id,
        label: settings.defaults.profile.profileName,
      };
    }
    return (
      <div className="container settings">
        <div className="row">
          <div className="col col--start">
            <div className="row row--start">
              <div className="col col--no-gutter-left">
                <h1 className="text-header settings__title">Settings</h1>
              </div>
            </div>
            <div className="row">
              <div className="col">
                <div className="row row--start">
                  <div className="col col--no-gutter-left">
                    <p className="body-text section-header proxy-list__section-header">
                      Proxy List
                    </p>
                  </div>
                </div>
                <div className="row">
                  <div className="col col--no-gutter-left col--expand">
                    <div className="proxy-list col col--start col--no-gutter">
                      <div className="row row--start row--gutter">
                        <div className="col proxy-list__input-group">
                          <div className="row row--gutter">
                            <div className="col col--no-gutter">
                              <ProxyList className="proxy-list__input-group--text" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col col--start settings__extras">
                <div className="row row--start">
                  <div className="col">
                    <p className="settings__label">Discord URL</p>
                  </div>
                </div>
                <div className="row row--no-gutter-left">
                  <div className="col col--start">
                    <input
                      className="settings__input-group--webhook"
                      placeholder="https://discordapp.com/api/webhooks/..."
                      onChange={this.createOnChangeHandler(SETTINGS_FIELDS.EDIT_DISCORD)}
                      style={buildStyle(
                        false,
                        errors[mapSettingsFieldToKey[SETTINGS_FIELDS.EDIT_DISCORD]],
                      )}
                      value={settings.discord}
                    />
                  </div>
                </div>
                <div className="row row--start">
                  <div className="col">
                    <p className="settings__label">Slack URL</p>
                  </div>
                </div>
                <div className="row">
                  <div className="col col--start">
                    <input
                      className="settings__input-group--webhook"
                      placeholder="https://hooks.slack.com/services/..."
                      onChange={this.createOnChangeHandler(SETTINGS_FIELDS.EDIT_SLACK)}
                      style={buildStyle(
                        false,
                        errors[mapSettingsFieldToKey[SETTINGS_FIELDS.EDIT_SLACK]],
                      )}
                      value={settings.slack}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

SettingsPrimitive.propTypes = {
  onSettingsChange: PropTypes.func.isRequired,
  onSaveDefaults: PropTypes.func.isRequired,
  onClearDefaults: PropTypes.func.isRequired,
  onTestDiscord: PropTypes.func.isRequired,
  onTestSlack: PropTypes.func.isRequired,
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
  onTestDiscord: hook => {
    dispatch(settingsActions.test(hook, 'discord'));
  },
  onTestSlack: hook => {
    dispatch(settingsActions.test(hook, 'slack'));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(SettingsPrimitive);
