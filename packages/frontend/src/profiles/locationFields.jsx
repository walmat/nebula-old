import React, { Component } from 'react';
import Select from 'react-select';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import defns from '../utils/definitions/profileDefinitions';
import getAllCountries, { getProvinces, getCountry } from '../constants/getAllCountries';
import { LOCATION_FIELDS, profileActions, mapProfileFieldToKey } from '../state/actions';
import './profiles.css';
import { buildStyle } from '../utils/styles';
import { DropdownIndicator, colourStyles } from '../utils/styles/select';

export class LocationFieldsPrimitive extends Component {
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

  render() {
    const { id, value, errors, disabled } = this.props;
    return (
      <div className="profiles-location col col--start col--no-gutter">
        <div className="row row--start row--gutter">
          <div className="col profiles-location__input-group">
            <div className="row row--gutter">
              <input
                className={`${id}__input-group--first-name`}
                required
                placeholder="First Name"
                onChange={this.createOnChangeHandler(LOCATION_FIELDS.FIRST_NAME)}
                value={value.firstName}
                style={buildStyle(disabled, errors[LOCATION_FIELDS.FIRST_NAME])}
                disabled={disabled}
              />
            </div>
            <div className="row row--gutter">
              <input
                id={`${id}__input-group--last-name`}
                required
                placeholder="Last Name"
                onChange={this.createOnChangeHandler(LOCATION_FIELDS.LAST_NAME)}
                value={value.lastName}
                style={buildStyle(disabled, errors[LOCATION_FIELDS.LAST_NAME])}
                disabled={disabled}
              />
            </div>
            <div className="row row--gutter">
              <input
                id={`${id}__input-group--address-one`}
                required
                placeholder="Address Line 1"
                onChange={this.createOnChangeHandler(LOCATION_FIELDS.ADDRESS)}
                value={value.address}
                style={buildStyle(disabled, errors[LOCATION_FIELDS.ADDRESS])}
                disabled={disabled}
              />
            </div>
            <div className="row row--gutter">
              <input
                id={`${id}__input-group--address-two`}
                placeholder="Address Line 2"
                onChange={this.createOnChangeHandler(LOCATION_FIELDS.APT)}
                value={value.apt}
                style={buildStyle(disabled, errors[LOCATION_FIELDS.APT])}
                disabled={disabled}
              />
            </div>
            <div className="row row--gutter">
              <div className="col col--no-gutter">
                <input
                  id={`${id}__input-group--city`}
                  required
                  placeholder="City"
                  onChange={this.createOnChangeHandler(LOCATION_FIELDS.CITY)}
                  value={value.city}
                  style={buildStyle(disabled, errors[LOCATION_FIELDS.CITY])}
                  disabled={disabled}
                />
              </div>
              <div className="col col--no-gutter">
                <Select
                  required
                  placeholder="Province"
                  components={{ DropdownIndicator }}
                  id={`${id}__input-group--province`}
                  classNamePrefix="select"
                  options={LocationFieldsPrimitive.buildProvinceOptions(value.country) || undefined}
                  onChange={this.createOnChangeHandler(LOCATION_FIELDS.PROVINCE)}
                  value={value.province}
                  styles={colourStyles(buildStyle(disabled, errors[LOCATION_FIELDS.PROVINCE]))}
                  isDisabled={this.isProvinceFieldDisabled()}
                />
              </div>
            </div>
            <div className="row row--gutter">
              <div className="col col--no-gutter">
                <input
                  id={`${id}__input-group--zip-code`}
                  required
                  placeholder="Zip Code"
                  onChange={this.createOnChangeHandler(LOCATION_FIELDS.ZIP_CODE)}
                  value={value.zipCode}
                  style={buildStyle(disabled, errors[LOCATION_FIELDS.ZIP_CODE])}
                  disabled={disabled}
                />
              </div>
              <div className="col col--no-gutter">
                <Select
                  required
                  placeholder="Country"
                  components={{ DropdownIndicator }}
                  id={`${id}__input-group--country`}
                  classNamePrefix="select"
                  options={LocationFieldsPrimitive.buildCountryOptions()}
                  onChange={this.createOnChangeHandler(LOCATION_FIELDS.COUNTRY)}
                  value={value.country}
                  styles={colourStyles(buildStyle(disabled, errors[LOCATION_FIELDS.COUNTRY]))}
                  isDisabled={disabled}
                />
              </div>
            </div>
            <div className="row row--gutter">
              <input
                id={`${id}__input-group--phone`}
                required
                placeholder="Phone"
                onChange={this.createOnChangeHandler(LOCATION_FIELDS.PHONE_NUMBER)}
                value={value.phone}
                style={buildStyle(disabled, errors[LOCATION_FIELDS.PHONE_NUMBER])}
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

LocationFieldsPrimitive.propTypes = {
  errors: defns.locationStateErrors.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
  id: PropTypes.string.isRequired,
  value: defns.locationState.isRequired,
};

export const mapStateToProps = (state, ownProps) => ({
  id: ownProps.id,
  disabled: ownProps.disabled,
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
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(LocationFieldsPrimitive);
