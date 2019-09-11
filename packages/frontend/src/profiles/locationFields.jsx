import React, { PureComponent } from 'react';
import Select from 'react-select';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import defns from '../utils/definitions/profileDefinitions';
import getAllCountries, { getProvinces, getCountry } from '../constants/getAllCountries';
import {
  LOCATION_FIELDS,
  profileActions,
  mapProfileFieldToKey,
  PROFILE_FIELDS,
} from '../state/actions';
import { buildStyle } from '../utils/styles';
import {
  DropdownIndicator,
  IndicatorSeparator,
  Control,
  Menu,
  MenuList,
  Option,
  colourStyles,
} from '../utils/styles/select';
import { addTestId, renderSvgIcon } from '../utils';

import { ReactComponent as BillingMatchesShippingIcon } from '../_assets/Check_icons-01.svg';
import { ReactComponent as CopyShippingInfoToBilling } from '../_assets/transfer.svg';
import { ReactComponent as BillingDoesNotMatchShippingIcon } from '../_assets/Check_icons-02.svg';

import './profiles.css';

export class LocationFieldsPrimitive extends PureComponent {
  static buildCountryOptions() {
    return getAllCountries().map(country => ({
      value: country.code,
      label: country.name,
    }));
  }

  static buildProvinceOptions(country) {
    if (country && country.value) {
      return getProvinces(country.value).map(province => ({
        value: province.code,
        label: province.name,
      }));
    }
    return null;
  }

  createOnChangeHandler(field) {
    const { onChange, value } = this.props;
    switch (field) {
      case LOCATION_FIELDS.PROVINCE: {
        return event => {
          onChange({
            field,
            value: { province: event, country: value.country },
          });
        };
      }
      case LOCATION_FIELDS.COUNTRY: {
        return event => {
          onChange({
            field,
            value: event,
          });
        };
      }
      default: {
        return event => {
          onChange({
            field,
            value: event.target.value,
          });
        };
      }
    }
  }

  isProvinceFieldDisabled() {
    const {
      disabled,
      value: { country },
    } = this.props;
    if (country && country.value) {
      const { provinces } = getCountry(country.value);
      if (!provinces || !provinces.length) {
        return true;
      }
    }
    return disabled;
  }

  renderButtons() {
    const {
      id,
      onClickBillingMatchesShipping,
      onClickTransferShippingInformation,
      onKeyPress,
      currentProfile,
    } = this.props;
    if (id === 'shipping') {
      return (
        <div className="row">
          <div className="col col--no-gutter-right">
            <div
              role="button"
              tabIndex={0}
              onKeyPress={onKeyPress}
              onClick={onClickBillingMatchesShipping}
            >
              {currentProfile.billingMatchesShipping
                ? renderSvgIcon(BillingMatchesShippingIcon, {
                    title: 'Billing Matches Shipping',
                    alt: 'Billing Matches Shipping',
                    className: 'profiles__fields--matches',
                  })
                : renderSvgIcon(BillingDoesNotMatchShippingIcon, {
                    title: "Billing Doesn't Match Shipping",
                    alt: "Billing Doesn't Match Shipping",
                    className: 'profiles__fields--matches',
                  })}
            </div>
          </div>
          <div className="col col--no-gutter-left">
            <div
              role="button"
              tabIndex={0}
              onKeyPress={onKeyPress}
              onClick={onClickTransferShippingInformation}
            >
              {renderSvgIcon(CopyShippingInfoToBilling, {
                title: 'Transfer Shipping Information',
                alt: '',
                className: 'profiles__fields--transfer',
              })}
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  render() {
    const { id, header, className, value, errors, disabled, theme } = this.props;
    return (
      <div className={className}>
        <div className="row row--start">
          <p className="body-text section-header profiles-location__section-header">{header}</p>
        </div>
        <div className="row">
          <div className="col col--no-gutter col--start profiles-shipping-container">
            <div className="profiles-location col col--start col--no-gutter">
              <div className="row row--start row--no-gutter-left row--gutter-right">
                <div className="col profiles-location__input-group">
                  <div className="row row--gutter">
                    <input
                      className={`${id}-profiles-location__input-group--first-name`}
                      required
                      placeholder="First Name"
                      onChange={this.createOnChangeHandler(LOCATION_FIELDS.FIRST_NAME)}
                      value={value.firstName}
                      style={buildStyle(disabled, errors[LOCATION_FIELDS.FIRST_NAME])}
                      disabled={disabled}
                      data-testid={addTestId(`LocationFieldsPrimitive.${id}-firstName`)}
                      data-private
                    />
                  </div>
                  <div className="row row--gutter">
                    <input
                      className={`${id}-profiles-location__input-group--last-name`}
                      required
                      placeholder="Last Name"
                      onChange={this.createOnChangeHandler(LOCATION_FIELDS.LAST_NAME)}
                      value={value.lastName}
                      style={buildStyle(disabled, errors[LOCATION_FIELDS.LAST_NAME])}
                      disabled={disabled}
                      data-testid={addTestId(`LocationFieldsPrimitive.${id}-lastName`)}
                      data-private
                    />
                  </div>
                  <div className="row row--gutter">
                    <input
                      className={`${id}-profiles-location__input-group--address-one`}
                      required
                      placeholder="Address Line 1"
                      onChange={this.createOnChangeHandler(LOCATION_FIELDS.ADDRESS)}
                      value={value.address}
                      style={buildStyle(disabled, errors[LOCATION_FIELDS.ADDRESS])}
                      disabled={disabled}
                      data-testid={addTestId(`LocationFieldsPrimitive.${id}-address`)}
                      data-private
                    />
                  </div>
                  <div className="row row--gutter">
                    <input
                      className={`${id}-profiles-location__input-group--address-two`}
                      placeholder="Address Line 2"
                      onChange={this.createOnChangeHandler(LOCATION_FIELDS.APT)}
                      value={value.apt}
                      style={buildStyle(disabled, errors[LOCATION_FIELDS.APT])}
                      disabled={disabled}
                      data-testid={addTestId(`LocationFieldsPrimitive.${id}-apt`)}
                      data-private
                    />
                  </div>
                  <div className="row row--start row--gutter">
                    <div className="col col--no-gutter">
                      <input
                        className={`${id}-profiles-location__input-group--city`}
                        required
                        placeholder="City"
                        onChange={this.createOnChangeHandler(LOCATION_FIELDS.CITY)}
                        value={value.city}
                        style={buildStyle(disabled, errors[LOCATION_FIELDS.CITY])}
                        disabled={disabled}
                        data-testid={addTestId(`LocationFieldsPrimitive.${id}-city`)}
                        data-private
                      />
                    </div>
                    <div className="col col--no-gutter">
                      <Select
                        required
                        placeholder="Province"
                        components={{
                          DropdownIndicator,
                          IndicatorSeparator,
                          Control,
                          Option,
                          Menu,
                          MenuList,
                        }}
                        className={`${id}-profiles-location__input-group--province`}
                        classNamePrefix="select"
                        options={
                          LocationFieldsPrimitive.buildProvinceOptions(value.country) || undefined
                        }
                        onChange={this.createOnChangeHandler(LOCATION_FIELDS.PROVINCE)}
                        value={value.province}
                        styles={colourStyles(
                          theme,
                          buildStyle(disabled, errors[LOCATION_FIELDS.PROVINCE]),
                        )}
                        isDisabled={this.isProvinceFieldDisabled()}
                        data-testid={addTestId(`LocationFieldsPrimitive.${id}-province`)}
                        data-private
                      />
                    </div>
                  </div>
                  <div className="row row--start row--gutter">
                    <div className="col col--no-gutter">
                      <input
                        className={`${id}-profiles-location__input-group--zip-code`}
                        required
                        placeholder="Zip Code"
                        onChange={this.createOnChangeHandler(LOCATION_FIELDS.ZIP_CODE)}
                        value={value.zipCode}
                        style={buildStyle(disabled, errors[LOCATION_FIELDS.ZIP_CODE])}
                        disabled={disabled}
                        data-testid={addTestId(`LocationFieldsPrimitive.${id}-zipCode`)}
                        data-private
                      />
                    </div>
                    <div className="col col--no-gutter">
                      <Select
                        required
                        placeholder="Country"
                        components={{
                          DropdownIndicator,
                          IndicatorSeparator,
                          Control,
                          Option,
                          Menu,
                          MenuList,
                        }}
                        className={`${id}-profiles-location__input-group--country`}
                        classNamePrefix="select"
                        options={LocationFieldsPrimitive.buildCountryOptions()}
                        onChange={this.createOnChangeHandler(LOCATION_FIELDS.COUNTRY)}
                        value={value.country}
                        styles={colourStyles(
                          theme,
                          buildStyle(disabled, errors[LOCATION_FIELDS.COUNTRY]),
                        )}
                        isDisabled={disabled}
                        data-testid={addTestId(`LocationFieldsPrimitive.${id}-country`)}
                        data-private
                      />
                    </div>
                  </div>
                  <div className="row row--start row--gutter">
                    <div className="col col--no-gutter">
                      <input
                        className={`${id}-profiles-location__input-group--phone`}
                        required
                        placeholder="Phone"
                        onChange={this.createOnChangeHandler(LOCATION_FIELDS.PHONE_NUMBER)}
                        value={value.phone}
                        style={buildStyle(disabled, errors[LOCATION_FIELDS.PHONE_NUMBER])}
                        disabled={disabled}
                        data-testid={addTestId(`LocationFieldsPrimitive.${id}-phone`)}
                        data-private
                      />
                    </div>
                    <div className="col col--gutter col--expand">{this.renderButtons()}</div>
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

LocationFieldsPrimitive.propTypes = {
  currentProfile: defns.profile.isRequired,
  errors: defns.locationStateErrors.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
  header: PropTypes.string.isRequired,
  className: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  theme: PropTypes.string.isRequired,
  value: defns.locationState.isRequired,
  onClickBillingMatchesShipping: PropTypes.func.isRequired,
  onClickTransferShippingInformation: PropTypes.func.isRequired,
  onKeyPress: PropTypes.func,
};

LocationFieldsPrimitive.defaultProps = {
  onKeyPress: () => {},
};

export const mapStateToProps = (state, ownProps) => ({
  id: ownProps.id,
  header: ownProps.header,
  className: ownProps.className,
  theme: state.theme,
  disabled: ownProps.disabled,
  currentProfile: state.currentProfile,
  errors: ownProps.profileToEdit[mapProfileFieldToKey[ownProps.fieldToEdit]].errors,
  value: ownProps.profileToEdit[mapProfileFieldToKey[ownProps.fieldToEdit]],
});

export const mapDispatchToProps = (dispatch, ownProps) => ({
  onChange: changes => {
    dispatch(
      profileActions.edit(
        ownProps.profileToEdit.id,
        ownProps.fieldToEdit,
        changes.value,
        changes.field,
      ),
    );
  },
  onClickTransferShippingInformation: () => {
    dispatch(profileActions.transfer());
  },
  onClickBillingMatchesShipping: () => {
    dispatch(profileActions.edit(null, PROFILE_FIELDS.TOGGLE_BILLING_MATCHES_SHIPPING, ''));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(LocationFieldsPrimitive);
