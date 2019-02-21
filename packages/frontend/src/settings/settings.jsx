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
import { mapThemeToColor } from '../constants/themes';

export class SettingsPrimitive extends Component {
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

  /*
   * Launch a sub-window with built in AI for image recognition
   * and capabilities of one-click harvesting
   */
  harvester() {
    const { theme } = this.props;
    if (window.Bridge) {
      window.Bridge.launchCaptchaHarvester({ backgroundColor: mapThemeToColor[theme] });
    } else {
      // TODO - error handling
      console.error('Unable to launch harvester!');
    }
  }

  render() {
    const {
      errors,
      theme,
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
                <div className="row row--start row-gutter">
                  <div className="col">
                    <div className="row row--gutter">
                      <div className="col col--no-gutter">
                        <p className="settings__label">Discord URL</p>
                        <input
                          className="settings__input-group--webhook__discord"
                          placeholder="https://discordapp.com/api/webhooks/..."
                          onChange={this.createOnChangeHandler(SETTINGS_FIELDS.EDIT_DISCORD)}
                          style={buildStyle(
                            false,
                            errors[mapSettingsFieldToKey[SETTINGS_FIELDS.EDIT_DISCORD]],
                          )}
                          value={settings.discord}
                        />
                      </div>
                      <div className="col col--end col--no-gutter-right">
                        <button
                          type="button"
                          className="settings__input-group--button"
                          tabIndex={0}
                          onKeyPress={onKeyPress}
                          onClick={() => {
                            onTestDiscord(settings.discord);
                          }}
                        >
                          Test
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="row row--start row-gutter">
                  <div className="col">
                    <div className="row row--gutter">
                      <div className="col col--no-gutter">
                        <p className="settings__label">Slack URL</p>
                        <input
                          className="settings__input-group--webhook__slack"
                          placeholder="https://hooks.slack.com/services/..."
                          onChange={this.createOnChangeHandler(SETTINGS_FIELDS.EDIT_SLACK)}
                          style={buildStyle(
                            false,
                            errors[mapSettingsFieldToKey[SETTINGS_FIELDS.EDIT_SLACK]],
                          )}
                          value={settings.slack}
                        />
                      </div>
                      <div className="col col--end col--no-gutter-right">
                        <button
                          type="button"
                          className="settings__input-group--button"
                          tabIndex={0}
                          onKeyPress={onKeyPress}
                          onClick={() => {
                            onTestSlack(settings.slack);
                          }}
                        >
                          Test
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="row row--gutter">
                  <div className="col">
                    <div className="row row--start">
                      <div className="col col--no-gutter-left">
                        <p className="body-text section-header settings-defaults__section-header">
                          Defaults
                        </p>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col col--no-gutter-left">
                        <div className="row row--start row-gutter">
                          <div className="col settings-defaults__input-group">
                            <div className="row row--gutter">
                              <div className="col col--no-gutter-right">
                                <p className="settings-defaults__input-group--label">Profile</p>
                                <Select
                                  required
                                  placeholder="Choose Profile"
                                  components={{ DropdownIndicator }}
                                  className="settings-defaults__input-group--select__profile"
                                  classNamePrefix="select"
                                  styles={colourStyles(
                                    theme,
                                    buildStyle(
                                      false,
                                      errors[
                                        mapSettingsFieldToKey[SETTINGS_FIELDS.EDIT_DEFAULT_PROFILE]
                                      ],
                                    ),
                                  )}
                                  onChange={this.createOnChangeHandler(
                                    SETTINGS_FIELDS.EDIT_DEFAULT_PROFILE,
                                  )}
                                  value={defaultProfileValue}
                                  options={this.buildProfileOptions()}
                                />
                              </div>
                              <div className="col col--end col--gutter-left">
                                <p className="settings-defaults__input-group--label">Sizes</p>
                                <Select
                                  required
                                  isMulti
                                  isClearable={false}
                                  placeholder="Choose Sizes"
                                  components={{ DropdownIndicator }}
                                  className="settings-defaults__input-group--select__sizes"
                                  classNamePrefix="select"
                                  styles={colourStyles(
                                    theme,
                                    buildStyle(
                                      false,
                                      errors[
                                        mapSettingsFieldToKey[SETTINGS_FIELDS.EDIT_DEFAULT_SIZES]
                                      ],
                                    ),
                                  )}
                                  onChange={this.createOnChangeHandler(
                                    SETTINGS_FIELDS.EDIT_DEFAULT_SIZES,
                                  )}
                                  value={defaultSizes}
                                  options={SettingsPrimitive.buildSizeOptions()}
                                />
                              </div>
                            </div>
                            <div className="row row--gutter row--end">
                              <div className="col col--no-gutter-right">
                                <button
                                  type="button"
                                  className="settings-defaults__input-group--save"
                                  tabIndex={0}
                                  onKeyPress={onKeyPress}
                                  onClick={() => {
                                    onSaveDefaults(settings.defaults);
                                  }}
                                >
                                  Save
                                </button>
                              </div>
                              <div className="col col--end col--gutter-left">
                                <button
                                  type="button"
                                  className="settings-defaults__input-group--clear"
                                  tabIndex={0}
                                  onKeyPress={onKeyPress}
                                  onClick={() => {
                                    onClearDefaults(SETTINGS_FIELDS.CLEAR_DEFAULTS);
                                  }}
                                >
                                  Clear
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="row row--start row-gutter">
                  <div className="col">
                    <div className="row row--gutter">
                      <div className="col col--no-gutter">
                        <p className="settings__label">Monitor Delay</p>
                        <NumberFormat
                          value={settings.monitorDelay}
                          placeholder="1500"
                          className="settings__input-group--delays__monitor"
                          style={buildStyle(
                            false,
                            errors[mapSettingsFieldToKey[SETTINGS_FIELDS.EDIT_MONITOR_DELAY]],
                          )}
                          onChange={this.createOnChangeHandler(SETTINGS_FIELDS.EDIT_MONITOR_DELAY)}
                          required
                        />
                      </div>
                      <div className="col col--end col--no-gutter-right">
                        <p className="settings__label">Error Delay</p>
                        <NumberFormat
                          value={settings.errorDelay}
                          placeholder="1500"
                          className="settings__input-group--delays__error"
                          style={buildStyle(
                            false,
                            errors[mapSettingsFieldToKey[SETTINGS_FIELDS.EDIT_ERROR_DELAY]],
                          )}
                          onChange={this.createOnChangeHandler(SETTINGS_FIELDS.EDIT_ERROR_DELAY)}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="row row--start row-gutter">
                  <div className="col">
                    <div className="row row--gutter">
                      <div className="col col--no-gutter">
                        <button
                          type="button"
                          className="settings__button--open-captcha"
                          onClick={() => this.harvester()}
                        >
                          Captcha Window
                        </button>
                      </div>
                      <div className="col col--end col--no-gutter-right">
                        <button
                          type="button"
                          className="settings__button--close-captcha"
                          onClick={SettingsPrimitive.closeAllCaptchaWindows}
                        >
                          Close All Windows
                        </button>
                      </div>
                    </div>
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
  theme: PropTypes.string.isRequired,
};

SettingsPrimitive.defaultProps = {
  onKeyPress: () => {},
};

export const mapStateToProps = state => ({
  profiles: state.profiles,
  settings: state.settings,
  errors: state.settings.errors,
  theme: state.theme,
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
