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
        className: 'profile',
        colStyling: 'col col--no-gutter-right',
      },
      [SETTINGS_FIELDS.EDIT_SHIPPING_SITE]: {
        label: 'Site',
        placeholder: 'Choose Site',
        className: 'site',
        colStyling: 'col col--gutter-left',
      },
    };
    this.buttons = {
      [SETTINGS_FIELDS.CLEAR_SHIPPING_FIELDS]: {
        label: 'Clear',
        className: 'clear',
      },
      [SETTINGS_FIELDS.FETCH_SHIPPING_METHODS]: {
        label: 'Fetch Shipping',
        className: 'fetch',
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

  renderButton(field, value) {
    const { onKeyPress, onClearShippingFields, onFetchShippingMethods } = this.props;
    const { className, label } = this.buttons[field];
    const onClick = () =>
      field === SETTINGS_FIELDS.FETCH_SHIPPING_METHODS
        ? onFetchShippingMethods(value)
        : onClearShippingFields(field);
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
          isMulti={false}
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
    const { settings, errors } = this.props;
    let shippingProfileValue = null;
    if (settings.shipping.profile.id !== null) {
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
                      <div className="col col--no-gutter-right">
                        <p className="settings--shipping-manager__input-group--label">Product</p>
                        <input
                          className="settings--shipping-manager__input-group--product"
                          type="text"
                          placeholder="Variant, Keywords, Link"
                          onChange={this.createOnChangeHandler(
                            SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT,
                          )}
                          value={settings.shipping.product.raw}
                          style={buildStyle(
                            false,
                            errors[mapSettingsFieldToKey[SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT]],
                          )}
                          required
                        />
                      </div>
                      <div className="col col--gutter-left">
                        <p className="settings--shipping-manager__input-group--label">
                          Shipping Rate
                        </p>
                        <input
                          className="settings--shipping-manager__input-group--product"
                          type="text"
                          placeholder=""
                          disabled
                          onChange={this.createOnChangeHandler(
                            SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT,
                          )}
                          value={settings.shipping.rate}
                          style={buildStyle(
                            false,
                            errors[mapSettingsFieldToKey[SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT]],
                          )}
                          required
                        />
                      </div>
                    </div>
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
                        {this.renderButton(
                          SETTINGS_FIELDS.FETCH_SHIPPING_METHODS,
                          settings.shipping,
                        )}
                      </div>
                      <div className="col col--end col--gutter-left">
                        {this.renderButton(SETTINGS_FIELDS.CLEAR_SHIPPING_FIELDS)}
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
  onFetchShippingMethods: PropTypes.func.isRequired,
  onClearShippingFields: PropTypes.func.isRequired,
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
  onFetchShippingMethods: shipping => {
    dispatch(settingsActions.fetch(shipping));
  },
  onClearShippingFields: changes => {
    dispatch(settingsActions.clearShipping(changes));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ShippingManagerPrimitive);
