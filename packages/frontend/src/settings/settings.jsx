import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import NumberFormat from 'react-number-format';
import ProxyList from './proxyList';
import Webhooks from './webhooks';
import Defaults from './defaults';
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
      // TODO - Show notification #77: https://github.com/walmat/nebula/issues/77
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
    const { onSettingsChange } = this.props;
    return event => {
      onSettingsChange({
        field,
        value: event.target.value,
      });
    };
  }

  renderDelay(colStyling, label, value, placeholder, className, field) {
    const { errors } = this.props;
    return (
      <div className={`col ${colStyling}`}>
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
                <ProxyList />
              </div>
              <div className="col col--start settings__extras">
                <Webhooks />
                <Defaults />
                <div className="row row--start row-gutter">
                  <div className="col">
                    <div className="row row--gutter">
                      {this.renderDelay(
                        'col--no-gutter',
                        'Monitor Delay',
                        monitorDelay,
                        '3500',
                        'monitor',
                        SETTINGS_FIELDS.EDIT_MONITOR_DELAY,
                      )}
                      {this.renderDelay(
                        'col--end col--no-gutter-right',
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
                        <button
                          type="button"
                          className="settings__button--open-captcha"
                          onClick={() => SettingsPrimitive.openHarvesterWindow(theme)}
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
  settings: sDefns.settings.isRequired,
  theme: PropTypes.string.isRequired,
  errors: sDefns.settingsErrors.isRequired,
};

export const mapStateToProps = state => ({
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
