import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import NumberFormat from 'react-number-format';
import ProxyList from './proxyList';
import Webhooks from './webhooks';
import Defaults from './defaults';
import pDefns from '../utils/definitions/profileDefinitions';
import sDefns from '../utils/definitions/settingsDefinitions';
import { settingsActions, mapSettingsFieldToKey, SETTINGS_FIELDS } from '../state/actions';
import { buildStyle } from '../utils/styles';
import { mapThemeToColor } from '../constants/themes';

import '../app.css';
import './settings.css';

export class SettingsPrimitive extends Component {
  static openHarvesterWindow(theme) {
    if (window.Bridge) {
      window.Bridge.launchCaptchaHarvester({ backgroundColor: mapThemeToColor[theme] });
    } else {
      // TODO - error handling
      console.error('Unable to launch harvester!');
    }
  }

  static closeAllCaptchaWindows() {
    if (window.Bridge) {
      window.Bridge.closeAllCaptchaWindows();
    } else {
      // TODO - error handling
      console.error('Unable to close all windows');
    }
  }

  static renderCaptchaButton(className, onClick, label) {
    return (
      <button type="button" className={`settings__button--${className}`} onClick={onClick}>
        {label}
      </button>
    );
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

  renderDelays(label, value, placeholder, className, field) {
    const { errors } = this.props;
    return (
      <div
        className={`col ${
          className === 'error' ? 'col--end col--no-gutter-right' : 'col--no-gutter'
        }`}
      >
        <p className="settings__label">{label}</p>
        <NumberFormat
          value={value}
          placeholder={placeholder}
          className={`settings__input-group--delays__${className}`}
          style={buildStyle(false, errors[mapSettingsFieldToKey[field]])}
          onChange={this.createOnChangeHandler(field)}
          required
        />
      </div>
    );
  }

  render() {
    const { settings, theme } = this.props;
    const { errorDelay, monitorDelay } = settings;
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
                <ProxyList className="proxy-list__input-group--text" />
              </div>
              <div className="col col--start settings__extras">
                <Webhooks />
                <Defaults theme={theme} />
                <div className="row row--start row-gutter">
                  <div className="col">
                    <div className="row row--gutter">
                      {this.renderDelays(
                        'Monitor Delay',
                        monitorDelay,
                        '3500',
                        'monitor',
                        SETTINGS_FIELDS.EDIT_MONITOR_DELAY,
                      )}
                      {this.renderDelays(
                        'Error Delay',
                        errorDelay,
                        '3500',
                        'error',
                        SETTINGS_FIELDS.EDIT_ERROR_DELAY,
                      )}
                    </div>
                  </div>
                </div>
                <div className="row row--start row-gutter">
                  <div className="col">
                    <div className="row row--gutter">
                      <div className="col col--no-gutter">
                        {SettingsPrimitive.renderCaptchaButton(
                          'open-captcha',
                          () => SettingsPrimitive.openHarvesterWindow(theme),
                          'Captcha Window',
                        )}
                      </div>
                      <div className="col col--end col--no-gutter-right">
                        {SettingsPrimitive.renderCaptchaButton(
                          'close-captcha',
                          SettingsPrimitive.closeAllCaptchaWindows,
                          'Close All Windows',
                        )}
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
  profiles: pDefns.profileList.isRequired,
  settings: sDefns.settings.isRequired,
  theme: PropTypes.string.isRequired,
  errors: sDefns.settingsErrors.isRequired,
};

export const mapStateToProps = state => ({
  profiles: state.profiles,
  settings: state.settings,
  theme: state.theme,
  errors: state.settings.errors,
});

export const mapDispatchToProps = dispatch => ({
  onSettingsChange: changes => {
    dispatch(settingsActions.edit(changes.field, changes.value));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(SettingsPrimitive);
