import React, { Component } from 'react';
import Select from 'react-select';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { buildStyle } from '../utils/styles';
import { DropdownIndicator, colourStyles } from '../utils/styles/select';
import { settingsActions, mapSettingsFieldToKey, SETTINGS_FIELDS } from '../state/actions';
import pDefns from '../utils/definitions/profileDefinitions';
import sDefns from '../utils/definitions/settingsDefinitions';
import getAllSupportedSitesSorted from '../constants/getAllSites';

export class ShippingManagerPrimitive extends Component {
  constructor(props) {
    super(props);
    this.selects = {
      [SETTINGS_FIELDS.EDIT_SHIPPING_PROFILE]: {
        label: 'Profile',
        placeholder: 'Choose Profile',
        className: 'select__profile',
        colStyling: 'col col--no-gutter-right',
      },
      [SETTINGS_FIELDS.EDIT_SHIPPING_SITE]: {
        label: 'Site',
        placeholder: 'Choose Site',
        className: 'select__site',
        colStyling: 'col col--no-gutter-right',
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
      case SETTINGS_FIELDS.EDIT_SHIPPING_PROFILE:
        return event => {
          const change = profiles.find(p => p.id === event.value);
          onSettingsChange({ field, value: change });
        };
      case SETTINGS_FIELDS.EDIT_SHIPPING_SITE:
        return event => {
          const site = {
            name: event.label,
            url: event.value,
            apiKey: event.apiKey,
            localCheckout: event.localCheckout || false,
            special: event.special || false,
            auth: event.auth,
          };
          onSettingsChange({ field, value: site });
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
        className={`settings--shipping-manager__input-group--${className}`}
        tabIndex={0}
        onKeyPress={onKeyPress}
        onClick={onClick}
      >
        {label}
      </button>
    );
  }

  renderSelect(field, value, options) {
    const { errors, theme } = this.props;
    const { label, placeholder, className, colStyling } = this.selects[field];
    return (
      <div className={colStyling}>
        <p className="settings--shipping-manager__input-group--label">{label}</p>
        <Select
          required
          placeholder={placeholder}
          components={{ DropdownIndicator }}
          isMulti={field === SETTINGS_FIELDS.EDIT_DEFAULT_SIZES}
          isClearable={false}
          className={`settings--shipping-manager__input-group--${className}`}
          classNamePrefix="select"
          styles={colourStyles(theme, buildStyle(false, errors[mapSettingsFieldToKey[field]]))}
          onChange={this.createOnChangeHandler(field)}
          value={value}
          options={options}
        />
      </div>
    );
  }

  render() {
    const { settings } = this.props;
    console.log(settings);
    let shippingProfileValue = null;
    if (settings.defaults.profile.id !== null) {
      shippingProfileValue = {
        value: settings.shipping.profile.id,
        label: settings.shipping.profile.profileName,
      };
    }
    let shippingSiteValue = null;
    if (settings.shipping.site && settings.shipping.site.name !== null) {
      shippingSiteValue = {
        value: settings.shipping.site.url,
        label: settings.shipping.site.name,
      };
    }
    return (
      <div>
        <div className="row row--gutter">
          <div className="col">
            <div className="row row--start">
              <div className="col col--no-gutter-left">
                <p className="body-text section-header settings--shipping-manager__section-header">
                  Shipping Rates
                </p>
              </div>
            </div>
            <div className="row">
              <div className="col col--no-gutter-left">
                <div className="row row--start row-gutter">
                  <div className="col settings--shipping-manager__input-group">
                    <div className="row row--gutter">
                      {this.renderSelect(
                        SETTINGS_FIELDS.EDIT_SHIPPING_PROFILE,
                        shippingProfileValue,
                        this.buildProfileOptions(),
                      )}
                      {this.renderSelect(
                        SETTINGS_FIELDS.EDIT_SHIPPING_SITE,
                        shippingSiteValue,
                        getAllSupportedSitesSorted(),
                      )}
                    </div>
                    <div className="row row--gutter row--end">
                      <div className="col col--no-gutter-right">
                        {this.renderDefaultsButton(
                          SETTINGS_FIELDS.SAVE_DEFAULTS,
                          settings.defaults,
                        )}
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

ShippingManagerPrimitive.propTypes = {
  onSettingsChange: PropTypes.func.isRequired,
  onSaveDefaults: PropTypes.func.isRequired,
  onClearDefaults: PropTypes.func.isRequired,
  profiles: pDefns.profileList.isRequired,
  settings: sDefns.settings.isRequired,
  onKeyPress: PropTypes.func,
  theme: PropTypes.string.isRequired,
  errors: sDefns.settingsErrors.isRequired,
};

ShippingManagerPrimitive.defaultProps = {
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
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ShippingManagerPrimitive);
