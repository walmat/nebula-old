import React, { PureComponent } from 'react';
import Select from 'react-select';
import CreatableSelect from 'react-select/lib/Creatable';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { parseURL } from 'whatwg-url';
import { buildStyle } from '../utils/styles';
import { DropdownIndicator, colourStyles } from '../utils/styles/select';
import { settingsActions, mapSettingsFieldToKey, SETTINGS_FIELDS } from '../state/actions';
import pDefns from '../utils/definitions/profileDefinitions';
import sDefns from '../utils/definitions/settingsDefinitions';
import getAllSupportedSitesSorted from '../constants/getAllSites';

import addTestId from '../utils/addTestId';

export class ShippingManagerPrimitive extends PureComponent {
  static createOption(value) {
    const sites = getAllSupportedSitesSorted();
    const exists = sites.find(s => s.value.indexOf(value) > -1);
    if (exists) {
      return {
        name: exists.label,
        url: exists.value,
        localCheckout: exists.localCheckout || false,
        special: exists.special || false,
        apiKey: exists.apiKey,
        auth: exists.auth,
      };
    }
    const URL = parseURL(value);
    if (!URL || !URL.host) {
      return null;
    }
    return { name: URL.host, url: `${URL.scheme}://${URL.host}` };
  }

  constructor(props) {
    super(props);
    this.handleCreate = this.handleCreate.bind(this);
    this.selects = {
      [SETTINGS_FIELDS.EDIT_SHIPPING_PROFILE]: {
        label: 'Profile',
        placeholder: 'Choose Profile',
        type: 'profile',
        className: 'col col--no-gutter-right',
      },
      [SETTINGS_FIELDS.EDIT_SHIPPING_SITE]: {
        label: 'Site',
        placeholder: 'Choose Site',
        type: 'site',
        className: 'col col--gutter-left',
      },
    };
    this.buttons = {
      [SETTINGS_FIELDS.CLEAR_SHIPPING_FIELDS]: {
        label: 'Clear',
        type: 'clear',
      },
      [SETTINGS_FIELDS.FETCH_SHIPPING_METHODS]: {
        label: 'Fetch Rates',
        type: 'fetch',
      },
    };
    this.state = {
      isLoading: false,
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

  handleCreate(value) {
    const { onSettingsChange } = this.props;
    this.setState({ isLoading: true });
    setTimeout(() => {
      const newOption = ShippingManagerPrimitive.createOption(value);
      if (newOption) {
        onSettingsChange({ field: SETTINGS_FIELDS.EDIT_SHIPPING_SITE, value: newOption });
      }
      this.setState({
        isLoading: false,
      });
    }, 100);
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
    const {
      onKeyPress,
      onClearShippingFields,
      onFetchShippingMethods,
      onStopShippingMethods,
      shipping: { status },
    } = this.props;
    const { type } = this.buttons[field];
    let { label } = this.buttons[field];
    let onClick;
    switch (field) {
      case SETTINGS_FIELDS.FETCH_SHIPPING_METHODS: {
        onClick = () => onFetchShippingMethods(value);
        break;
      }
      case SETTINGS_FIELDS.CLEAR_SHIPPING_FIELDS: {
        if (status === 'inprogress') {
          onClick = () => onStopShippingMethods();
          label = 'Cancel';
          break;
        }
        onClick = () => onClearShippingFields(field);
        break;
      }
      default: {
        onClick = () => {};
      }
    }
    const disabled = field === SETTINGS_FIELDS.FETCH_SHIPPING_METHODS && status === 'inprogress';
    return (
      <button
        type="button"
        className={`settings--shipping-manager__input-group--${type}`}
        tabIndex={0}
        onKeyPress={onKeyPress}
        onClick={onClick}
        disabled={disabled}
        data-testid={addTestId(`ShippingManager.button.${type}`)}
      >
        {disabled ? 'Fetching...' : label}
      </button>
    );
  }

  renderSelect(field, value, options) {
    const { isLoading } = this.state;
    const { errors, theme } = this.props;
    const { label, placeholder, className, type } = this.selects[field];
    return (
      <div className={className}>
        <p className="settings--shipping-manager__input-group--label">{label}</p>
        {field === SETTINGS_FIELDS.EDIT_SHIPPING_SITE ? (
          <CreatableSelect
            isClearable={false}
            isDisabled={isLoading}
            isLoading={isLoading}
            required
            placeholder={placeholder}
            components={{ DropdownIndicator }}
            isMulti={false}
            className={`settings--shipping-manager__input-group--${type}`}
            classNamePrefix="select"
            styles={colourStyles(theme, buildStyle(false, errors[mapSettingsFieldToKey[field]]))}
            onChange={this.createOnChangeHandler(field)}
            value={value}
            options={options}
          />
        ) : (
          <Select
            required
            placeholder={placeholder}
            components={{ DropdownIndicator }}
            isMulti={false}
            isClearable={false}
            className={`settings--shipping-manager__input-group--${type}`}
            classNamePrefix="select"
            styles={colourStyles(theme, buildStyle(false, errors[mapSettingsFieldToKey[field]]))}
            onChange={this.createOnChangeHandler(field)}
            value={value}
            options={options}
          />
        )}
      </div>
    );
  }

  render() {
    const { shipping, errors } = this.props;
    const { profile, site, product, name, username, password } = shipping;
    let shippingProfileValue = null;
    let accountFieldsDisabled = true;
    if (profile && profile.id !== null) {
      shippingProfileValue = {
        value: profile.id,
        label: profile.profileName,
      };
    }
    let shippingSiteValue = null;
    if (site) {
      accountFieldsDisabled = !site.auth && site.auth !== undefined;
      if (site.name) {
        shippingSiteValue = {
          value: site.url,
          label: site.name,
        };
      }
    }
    return (
      <div>
        <div className="row row--gutter">
          <div className="col">
            <div className="row row--start">
              <div className="col col--no-gutter-left">
                <p className="body-text section-header settings--shipping-manager__section-header">
                  Shipping Manager
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
                          value={product.raw}
                          style={buildStyle(
                            false,
                            errors[mapSettingsFieldToKey[SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT]],
                          )}
                          required
                        />
                      </div>
                      <div className="col col--gutter-left">
                        <p className="settings--shipping-manager__input-group--label">Rate Name</p>
                        <input
                          className="settings--shipping-manager__input-group--name"
                          type="text"
                          placeholder="Free Shipping"
                          onChange={this.createOnChangeHandler(
                            SETTINGS_FIELDS.EDIT_SHIPPING_RATE_NAME,
                          )}
                          value={name}
                          style={buildStyle(
                            false,
                            errors[mapSettingsFieldToKey[SETTINGS_FIELDS.EDIT_SHIPPING_RATE_NAME]],
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
                    <div className="row row--gutter">
                      <div className="col col--no-gutter-right">
                        <p className="settings--shipping-manager__input-group--label">Username</p>
                        <input
                          className="settings--shipping-manager__input-group--username"
                          type="text"
                          placeholder="johndoe@example.com"
                          onChange={this.createOnChangeHandler(
                            SETTINGS_FIELDS.EDIT_SHIPPING_USERNAME,
                          )}
                          value={username || ''}
                          style={buildStyle(
                            false,
                            errors[mapSettingsFieldToKey[SETTINGS_FIELDS.EDIT_SHIPPING_USERNAME]],
                          )}
                          required={!accountFieldsDisabled}
                          disabled={accountFieldsDisabled}
                        />
                      </div>
                      <div className="col col--gutter-right">
                        <p className="settings--shipping-manager__input-group--label">Password</p>
                        <input
                          className="settings--shipping-manager__input-group--password"
                          type="text"
                          placeholder="***********"
                          onChange={this.createOnChangeHandler(
                            SETTINGS_FIELDS.EDIT_SHIPPING_PASSWORD,
                          )}
                          value={password || ''}
                          style={buildStyle(
                            false,
                            errors[mapSettingsFieldToKey[SETTINGS_FIELDS.EDIT_SHIPPING_PASSWORD]],
                          )}
                          required={!accountFieldsDisabled}
                          disabled={accountFieldsDisabled}
                        />
                      </div>
                    </div>
                    <div className="row row--gutter row--end">
                      <div className="col col--no-gutter-right">
                        {this.renderButton(SETTINGS_FIELDS.FETCH_SHIPPING_METHODS, shipping)}
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
  onStopShippingMethods: PropTypes.func.isRequired,
  onClearShippingFields: PropTypes.func.isRequired,
  profiles: pDefns.profileList.isRequired,
  shipping: sDefns.shipping.isRequired,
  onKeyPress: PropTypes.func,
  theme: PropTypes.string.isRequired,
  errors: sDefns.shippingErrors.isRequired,
};

ShippingManagerPrimitive.defaultProps = {
  onKeyPress: () => {},
};

export const mapStateToProps = state => ({
  profiles: state.profiles,
  shipping: state.settings.shipping,
  errors: state.settings.shipping.errors,
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
  onStopShippingMethods: () => {
    dispatch(settingsActions.stop());
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ShippingManagerPrimitive);
