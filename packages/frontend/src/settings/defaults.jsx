import React, { Component } from 'react';
import Select from 'react-select';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { buildStyle } from '../utils/styles';
import { DropdownIndicator, colourStyles } from '../utils/styles/select';
import { settingsActions, mapSettingsFieldToKey, SETTINGS_FIELDS } from '../state/actions';
import pDefns from '../utils/definitions/profileDefinitions';
import sDefns from '../utils/definitions/settingsDefinitions';
import getAllSizes from '../constants/getAllSizes';

export class DefaultsPrimitive extends Component {
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
    const { onSettingsChange, profiles } = this.props;
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
    const { settings, errors, theme, onKeyPress, onSaveDefaults, onClearDefaults } = this.props;
    const defaultSizes = settings.defaults.sizes.map(s => ({ value: s, label: `${s}` }));
    let defaultProfileValue = null;
    if (settings.defaults.profile.id !== null) {
      defaultProfileValue = {
        value: settings.defaults.profile.id,
        label: settings.defaults.profile.profileName,
      };
    }
    return (
      <div>
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
                              errors[mapSettingsFieldToKey[SETTINGS_FIELDS.EDIT_DEFAULT_PROFILE]],
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
                              errors[mapSettingsFieldToKey[SETTINGS_FIELDS.EDIT_DEFAULT_SIZES]],
                            ),
                          )}
                          onChange={this.createOnChangeHandler(SETTINGS_FIELDS.EDIT_DEFAULT_SIZES)}
                          value={defaultSizes}
                          options={DefaultsPrimitive.buildSizeOptions()}
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
      </div>
    );
  }
}

DefaultsPrimitive.propTypes = {
  onSettingsChange: PropTypes.func.isRequired,
  onSaveDefaults: PropTypes.func.isRequired,
  onClearDefaults: PropTypes.func.isRequired,
  profiles: pDefns.profileList.isRequired,
  settings: sDefns.settings.isRequired,
  onKeyPress: PropTypes.func,
  theme: PropTypes.string.isRequired,
  errors: sDefns.settingsErrors.isRequired,
};

DefaultsPrimitive.defaultProps = {
  onKeyPress: () => {},
};

export const mapStateToProps = (state, ownProps) => ({
  profiles: state.profiles,
  settings: state.settings,
  errors: state.settings.errors,
  theme: ownProps.theme,
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
  mapDispatchToProps,
)(DefaultsPrimitive);
