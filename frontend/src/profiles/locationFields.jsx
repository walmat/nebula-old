import React, { Component } from 'react';
import Select from 'react-select';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import validationStatus from '../utils/validationStatus';
import defns from '../utils/definitions/profileDefinitions';
import getAllCountries from '../constants/getAllCountries';
import getAllStates from '../constants/getAllStates';
import { LOCATION_FIELDS, profileActions, mapProfileFieldToKey } from '../state/actions';
import './profiles.css';

import { DropdownIndicator, colourStyles } from '../utils/styles/select';

// const errorStyle = {
//   borderColor: 'red',
// };

export class LocationFieldsPrimitive extends Component {
  static buildCountryOptions() {
    return getAllCountries();
  }

  static buildStateOptions() {
    return getAllStates();
  }

  static buildStyle(disabled, errors) {
    return Object.assign(
      {},
      { backgroundColor: disabled ? '#e5e5e5' : '#F5F5F5' },
      validationStatus(errors),
    );
  }

  createOnChangeHandler(field) {
    switch (field) {
      case LOCATION_FIELDS.STATE:
      case LOCATION_FIELDS.COUNTRY:
        return (event) => {
          this.props.onChange({
            field,
            value: event,
          });
        };
      default:
        return (event) => {
          this.props.onChange({
            field,
            value: event.target.value,
          });
        };
    }
  }

  isStatesDisabled() {
    return (this.props.value.country && this.props.value.country.label !== 'United States') || this.props.disabled;
  }

  render() {
    const { errors, disabled } = this.props;
    return (
      <div>
        <input id={`${this.props.id}-first-name`} required placeholder="First Name" onChange={this.createOnChangeHandler(LOCATION_FIELDS.FIRST_NAME)} value={this.props.value.firstName} style={LocationFieldsPrimitive.buildStyle(disabled, errors[LOCATION_FIELDS.FIRST_NAME])} disabled={disabled} />
        <input id={`${this.props.id}-last-name`} required placeholder="Last Name" onChange={this.createOnChangeHandler(LOCATION_FIELDS.LAST_NAME)} value={this.props.value.lastName} style={LocationFieldsPrimitive.buildStyle(disabled, errors[LOCATION_FIELDS.LAST_NAME])} disabled={disabled} />
        <input id={`${this.props.id}-address-one`} required placeholder="Address Line 1" onChange={this.createOnChangeHandler(LOCATION_FIELDS.ADDRESS)} value={this.props.value.address} style={LocationFieldsPrimitive.buildStyle(disabled, errors[LOCATION_FIELDS.ADDRESS])} disabled={disabled} />
        <input id={`${this.props.id}-address-two`} placeholder="Address Line 2" onChange={this.createOnChangeHandler(LOCATION_FIELDS.APT)} value={this.props.value.apt} style={LocationFieldsPrimitive.buildStyle(disabled, errors[LOCATION_FIELDS.APT])} disabled={disabled} />
        <input id={`${this.props.id}-city`} required placeholder="City" onChange={this.createOnChangeHandler(LOCATION_FIELDS.CITY)} value={this.props.value.city} style={LocationFieldsPrimitive.buildStyle(disabled, errors[LOCATION_FIELDS.CITY])} disabled={disabled} />
        <Select
          required
          placeholder="State"
          components={{ DropdownIndicator }}
          id={`${this.props.id}-state`}
          styles={colourStyles}
          classNamePrefix="select"
          options={LocationFieldsPrimitive.buildStateOptions()}
          onChange={this.createOnChangeHandler(LOCATION_FIELDS.STATE)}
          value={this.props.value.state}
          // style={LocationFields.buildStyle(this.isStatesDisabled(), errors[LOCATION_FIELDS.STATE])}
          isDisabled={this.isStatesDisabled()}
        />
        <input id={`${this.props.id}-zip-code`} required placeholder="Zip Code" onChange={this.createOnChangeHandler(LOCATION_FIELDS.ZIP_CODE)} value={this.props.value.zipCode} style={LocationFieldsPrimitive.buildStyle(disabled, errors[LOCATION_FIELDS.ZIP_CODE])} disabled={disabled} />
        <Select
          required
          placeholder="Country"
          components={{ DropdownIndicator }}
          id={`${this.props.id}-country`}
          styles={colourStyles}
          classNamePrefix="select"
          options={LocationFieldsPrimitive.buildCountryOptions()}
          onChange={this.createOnChangeHandler(LOCATION_FIELDS.COUNTRY)}
          value={this.props.value.country}
          style={LocationFieldsPrimitive.buildStyle(disabled, errors[LOCATION_FIELDS.COUNTRY])}
          isDisabled={disabled}
        />
        <input id={`${this.props.id}-phone`} required placeholder="Phone" onChange={this.createOnChangeHandler(LOCATION_FIELDS.PHONE_NUMBER)} value={this.props.value.phone} style={LocationFieldsPrimitive.buildStyle(disabled, errors[LOCATION_FIELDS.PHONE_NUMBER])} disabled={disabled} />
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
  onChange: (changes) => {
    dispatch(profileActions.edit(
      ownProps.profileToEdit.id,
      ownProps.fieldToEdit,
      changes.value,
      changes.field,
    ));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(LocationFieldsPrimitive);
