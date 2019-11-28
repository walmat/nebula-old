import React, { PureComponent } from 'react';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { parseURL } from 'whatwg-url';
import { buildStyle } from '../../styles';
import {
  DropdownIndicator,
  IndicatorSeparator,
  Control,
  Menu,
  MenuList,
  Option,
  colourStyles,
} from '../../styles/components/select';
import { settingsActions, mapSettingsFieldToKey, SETTINGS_FIELDS } from '../../store/actions';
import pDefns from '../../store/definitions/profileDefinitions';
import sDefns from '../../store/definitions/settingsDefinitions';
import addTestId from '../../utils/addTestId';

export class ShippingManagerPrimitive extends PureComponent {
  static createOption(value) {
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
        className: 'col col--start col--expand col--gutter',
      },
      [SETTINGS_FIELDS.EDIT_SHIPPING_SITE]: {
        label: 'Site',
        placeholder: 'Choose Site',
        type: 'site',
        className: 'col col--start col--expand col--gutter',
      },
    };
    this.buttons = {
      [SETTINGS_FIELDS.CLEAR_SHIPPING_FIELDS]: {
        label: 'Clear',
        type: 'clear',
      },
      [SETTINGS_FIELDS.FETCH_SHIPPING_METHODS]: {
        label: 'Fetch rates',
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

  handleCreate(field, value) {
    const { onSettingsChange } = this.props;
    this.setState({ isLoading: true });
    setTimeout(() => {
      const newOption = ShippingManagerPrimitive.createOption(value);
      if (newOption) {
        onSettingsChange({ field, value: newOption });
      }
      this.setState({
        isLoading: false,
      });
    }, 500);
  }

  createOnChangeHandler(field) {
    const { onSettingsChange, profiles, sites } = this.props;
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
      case SETTINGS_FIELDS.EDIT_SHIPPING_PRODUCT:
        return event => onSettingsChange({ field, value: event.target.value, sites });
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
      shipping: { status, message },
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
        {field === SETTINGS_FIELDS.FETCH_SHIPPING_METHODS ? message || label : label}
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
            isOptionDisabled={option => !option.supported && option.supported !== undefined}
            required
            placeholder={placeholder}
            components={{ DropdownIndicator, IndicatorSeparator }}
            isMulti={false}
            className={`settings--shipping-manager__input-group--${type}`}
            classNamePrefix="select"
            styles={colourStyles(theme, buildStyle(false, errors[mapSettingsFieldToKey[field]]))}
            onChange={this.createOnChangeHandler(field)}
            onCreateOption={v => this.handleCreate(field, v)}
            value={value}
            options={options}
          />
        ) : (
          <Select
            required
            placeholder={placeholder}
            components={{ DropdownIndicator, IndicatorSeparator, Control, Option, Menu, MenuList }}
            isMulti={false}
            isClearable={false}
            className={`settings--shipping-manager__input-group--${type}`}
            classNamePrefix="select"
            styles={colourStyles(theme, buildStyle(false, errors[mapSettingsFieldToKey[field]]))}
            onChange={this.createOnChangeHandler(field)}
            value={value}
            options={options}
            data-private
          />
        )}
      </div>
    );
  }

  render() {
    const { shipping, sites, errors } = this.props;
    const { profile, site, product } = shipping;
    let shippingProfileValue = null;
    if (profile && profile.id !== null) {
      shippingProfileValue = {
        value: profile.id,
        label: profile.profileName,
      };
    }
    let shippingSiteValue = null;
    if (site && site.name) {
      shippingSiteValue = {
        value: site.url,
        label: site.name,
      };
    }
    return (
      <>
        <div className="row row--start row--expand row--gutter" style={{ flexGrow: 0 }}>
          <div className="col col--start col--expand col--no-gutter">
            <div className="row row--start row--gutter">
              <div className="col col--no-gutter-left">
                <p className="body-text section-header settings--shipping-manager__section-header">
                  Shipping Manager
                </p>
              </div>
            </div>
            <div className="row row--start row--gutter-left">
              <div className="col col--start col--expand col--no-gutter">
                <div className="row row--start row--expand row--no-gutter-left">
                  <div className="col col--start col--expand settings--shipping-manager__input-group">
                    <div
                      className="row row--start row--expand row--gutter"
                      style={{ marginTop: '15px' }}
                    >
                      <div className="col col--start col--expand col--no-gutter-right">
                        <p className="settings--shipping-manager__input-group--label">
                          Product / Shipping Rate
                        </p>
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
                      {this.renderSelect(
                        SETTINGS_FIELDS.EDIT_SHIPPING_PROFILE,
                        shippingProfileValue,
                        this.buildProfileOptions(),
                      )}
                    </div>
                    <div
                      className="row row--start row--expand row--gutter"
                      style={{ margin: '15px 0' }}
                    >
                      {this.renderSelect(
                        SETTINGS_FIELDS.EDIT_SHIPPING_SITE,
                        shippingSiteValue,
                        sites,
                      )}
                      <div className="col col--end" style={{ margin: '15px 0' }}>
                        {this.renderButton(SETTINGS_FIELDS.FETCH_SHIPPING_METHODS, shipping)}
                      </div>
                      <div className="col col--end col--gutter-left" style={{ margin: '15px' }}>
                        {this.renderButton(SETTINGS_FIELDS.CLEAR_SHIPPING_FIELDS)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
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
  sites: (state.sites || []).filter(site => site.label === 'Shopify'),
  shipping: state.settings.shipping,
  errors: state.settings.shipping.errors,
  theme: state.theme,
});

export const mapDispatchToProps = dispatch => ({
  onSettingsChange: changes => {
    dispatch(settingsActions.edit(changes.field, changes.value, changes.sites));
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
