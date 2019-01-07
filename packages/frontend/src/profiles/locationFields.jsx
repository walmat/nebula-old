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

  static buildStateOptions(country) {
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
      case LOCATION_FIELDS.STATE: {
        return event => {
          onChange({
            field,
            value: { state: event, country: value.country },
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

  isStatesDisabled(country) {
    const { disabled } = this.props;
    if (country && country.value) {
      const { provinces } = getCountry(country.value);
      if (provinces && provinces[0]) {
        return false || disabled;
      }
      return true;
    }
    return disabled;
  }

  render() {
    const { id, value, errors, disabled } = this.props;
    return (
      <div>
        <input
          id={`${id}-first-name`}
          required
          placeholder="First Name"
          onChange={this.createOnChangeHandler(LOCATION_FIELDS.FIRST_NAME)}
          value={value.firstName}
          style={buildStyle(disabled, errors[LOCATION_FIELDS.FIRST_NAME])}
          disabled={disabled}
        />
        <input
          id={`${id}-last-name`}
          required
          placeholder="Last Name"
          onChange={this.createOnChangeHandler(LOCATION_FIELDS.LAST_NAME)}
          value={value.lastName}
          style={buildStyle(disabled, errors[LOCATION_FIELDS.LAST_NAME])}
          disabled={disabled}
        />
        <input
          id={`${id}-address-one`}
          required
          placeholder="Address Line 1"
          onChange={this.createOnChangeHandler(LOCATION_FIELDS.ADDRESS)}
          value={value.address}
          style={buildStyle(disabled, errors[LOCATION_FIELDS.ADDRESS])}
          disabled={disabled}
        />
        <input
          id={`${id}-address-two`}
          placeholder="Address Line 2"
          onChange={this.createOnChangeHandler(LOCATION_FIELDS.APT)}
          value={value.apt}
          style={buildStyle(disabled, errors[LOCATION_FIELDS.APT])}
          disabled={disabled}
        />
        <input
          id={`${id}-city`}
          required
          placeholder="City"
          onChange={this.createOnChangeHandler(LOCATION_FIELDS.CITY)}
          value={value.city}
          style={buildStyle(disabled, errors[LOCATION_FIELDS.CITY])}
          disabled={disabled}
        />
        <Select
          required
          placeholder="State"
          components={{ DropdownIndicator }}
          id={`${id}-state`}
          classNamePrefix="select"
          options={LocationFieldsPrimitive.buildStateOptions(value.country) || undefined}
          onChange={this.createOnChangeHandler(LOCATION_FIELDS.STATE)}
          value={value.state}
          styles={colourStyles(buildStyle(disabled, errors[LOCATION_FIELDS.STATE]))}
          isDisabled={this.isStatesDisabled(value.country)}
        />
        <input
          id={`${id}-zip-code`}
          required
          placeholder="Zip Code"
          onChange={this.createOnChangeHandler(LOCATION_FIELDS.ZIP_CODE)}
          value={value.zipCode}
          style={buildStyle(disabled, errors[LOCATION_FIELDS.ZIP_CODE])}
          disabled={disabled}
        />
        <Select
          required
          placeholder="Country"
          components={{ DropdownIndicator }}
          id={`${id}-country`}
          classNamePrefix="select"
          options={LocationFieldsPrimitive.buildCountryOptions()}
          onChange={this.createOnChangeHandler(LOCATION_FIELDS.COUNTRY)}
          value={value.country}
          styles={colourStyles(buildStyle(disabled, errors[LOCATION_FIELDS.COUNTRY]))}
          isDisabled={disabled}
        />
        <input
          id={`${id}-phone`}
          required
          placeholder="Phone"
          onChange={this.createOnChangeHandler(LOCATION_FIELDS.PHONE_NUMBER)}
          value={value.phone}
          style={buildStyle(disabled, errors[LOCATION_FIELDS.PHONE_NUMBER])}
          disabled={disabled}
        />
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
