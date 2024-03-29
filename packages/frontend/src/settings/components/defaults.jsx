import React, { PureComponent } from 'react';
import Select from 'react-select';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { buildStyle } from '../utils/styles';
import {
  DropdownIndicator,
  Control,
  Menu,
  MenuList,
  Option,
  colourStyles,
} from '../../styles/components/select';
import { settingsActions, mapSettingsFieldToKey, SETTINGS_FIELDS } from '../../state/actions';
import pDefns from '../../state/definitions/profileDefinitions';
import sDefns from '../../state/definitions/settingsDefinitions';
import getAllSizes from '../../constants/getAllSizes';

export class DefaultsPrimitive extends PureComponent {
  static buildSizeOptions() {
    return getAllSizes();
  }

  constructor(props) {
    super(props);
    this.defaultsSelects = {
      [SETTINGS_FIELDS.EDIT_DEFAULT_SIZES]: {
        label: 'Sizes',
        placeholder: 'Choose Sizes',
        className: 'select__sizes',
        colStyling: 'col col--end col--gutter-left',
        dataPrivate: false,
      },
      [SETTINGS_FIELDS.EDIT_DEFAULT_PROFILE]: {
        label: 'Profile',
        placeholder: 'Choose Profile',
        className: 'select__profile',
        colStyling: 'col col--no-gutter-right',
        dataPrivate: true,
      },
    };
    this.defaultsButtons = {
      [SETTINGS_FIELDS.CLEAR_DEFAULTS]: {
        label: 'Clear',
        className: 'clear',
      },
      [SETTINGS_FIELDS.SAVE_DEFAULTS]: {
        label: 'Save',
        className: 'save',
      },
    };
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

  renderDefaultsButton(field, value) {
    const { onKeyPress, onClearDefaults, onSaveDefaults } = this.props;
    const { className, label } = this.defaultsButtons[field];
    const onClick = () =>
      field === SETTINGS_FIELDS.SAVE_DEFAULTS ? onSaveDefaults(value) : onClearDefaults(field);
    return (
      <button
        type="button"
        className={`settings-defaults__input-group--${className}`}
        tabIndex={0}
        onKeyPress={onKeyPress}
        onClick={onClick}
      >
        {label}
      </button>
    );
  }

  renderDefaultsSelect(field, value, options) {
    const { errors, theme } = this.props;
    const { label, placeholder, className, colStyling, dataPrivate } = this.defaultsSelects[field];
    return (
      <div className={colStyling}>
        <p className="settings-defaults__input-group--label">{label}</p>
        <Select
          required
          placeholder={placeholder}
          components={{ DropdownIndicator, Control, Option, Menu, MenuList }}
          isMulti={field === SETTINGS_FIELDS.EDIT_DEFAULT_SIZES}
          isClearable={false}
          className={`settings-defaults__input-group--${className}`}
          classNamePrefix="select"
          styles={colourStyles(theme, buildStyle(false, errors[mapSettingsFieldToKey[field]]))}
          onChange={this.createOnChangeHandler(field)}
          value={value}
          options={options}
          data-private={dataPrivate}
        />
      </div>
    );
  }

  render() {
    const { defaults } = this.props;
    const defaultSizes = defaults.sizes.map(s => ({ value: s, label: `${s}` }));
    let defaultProfileValue = null;
    if (defaults.profile.id !== null) {
      defaultProfileValue = {
        value: defaults.profile.id,
        label: defaults.profile.profileName,
      };
    }
    return (
      <div>
        <div className="row row--gutter defaults">
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
                      {this.renderDefaultsSelect(
                        SETTINGS_FIELDS.EDIT_DEFAULT_PROFILE,
                        defaultProfileValue,
                        this.buildProfileOptions(),
                      )}
                      {this.renderDefaultsSelect(
                        SETTINGS_FIELDS.EDIT_DEFAULT_SIZES,
                        defaultSizes,
                        DefaultsPrimitive.buildSizeOptions(),
                      )}
                    </div>
                    <div className="row row--gutter row--end">
                      <div className="col col--no-gutter-right">
                        {this.renderDefaultsButton(SETTINGS_FIELDS.SAVE_DEFAULTS, defaults)}
                      </div>
                      <div className="col col--end col--gutter-left">
                        {this.renderDefaultsButton(SETTINGS_FIELDS.CLEAR_DEFAULTS)}
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
  defaults: sDefns.defaults.isRequired,
  onKeyPress: PropTypes.func,
  theme: PropTypes.string.isRequired,
  errors: sDefns.settingsErrors.isRequired,
};

DefaultsPrimitive.defaultProps = {
  onKeyPress: () => {},
};

export const mapStateToProps = state => ({
  profiles: state.profiles,
  defaults: state.settings.defaults,
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
    dispatch(settingsActions.clearDefaults(changes));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(DefaultsPrimitive);
