import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import validationStatus from '../utils/validationStatus';
import getAllCountries from '../getAllCountries';
import getAllStates from '../getAllStates';
import { LOCATION_FIELDS, PROFILE_FIELDS, profileActions, mapProfileFieldToKey } from '../state/Actions';
import './Profiles.css';

const errorStyle = {
    borderColor: 'red'
};

class LocationFields extends Component {

    constructor(props) {
        super(props);
	}

	setBorderColor(validationErrors) {
    return validationErrors ? errorStyle : {};
  }

  createOnChangeHandler(field) {
    return (event) => {
      this.props.onChange({field: field, value: event.target.value});
    }
  }

  buildStyle(disabled, errors) {
      let style = {};
      style.backgroundColor = disabled ? '#e5e5e5' : '#F5F5F5';
      style = Object.assign(style, validationStatus(errors));
      return style;
  }

  buildCountryOptions() {
      let countries = getAllCountries();
      return countries.map((country) => {
          return <option key={country.name} value={country.name}>{country.name}</option>
      })
  }

  buildStateOptions = () => {
      let states = getAllStates();
      return states.map((state) => {
          return <option key={state.name} value={state.name}>{state.name}</option>
      })
  }

  isStatesDisabled = () => {
      return this.props.value.country !== 'United States' || this.props.disabled;
  }

	render() {
        const errors = this.props.errors;
        const disabled = this.props.disabled;
        return (
            <div>
                <input id={`${this.props.id}-first-name`} required placeholder="First Name" onChange={this.createOnChangeHandler(LOCATION_FIELDS.FIRST_NAME)} value={this.props.value.firstName} style={this.buildStyle(disabled, errors[LOCATION_FIELDS.FIRST_NAME])} disabled={disabled} />
                <input id={`${this.props.id}-last-name`} required placeholder="Last Name" onChange={this.createOnChangeHandler(LOCATION_FIELDS.LAST_NAME)} value={this.props.value.lastName} style={this.buildStyle(disabled, errors[LOCATION_FIELDS.LAST_NAME])} disabled={disabled}/>
                <input id={`${this.props.id}-address-one`} required placeholder="Address Line 1" onChange={this.createOnChangeHandler(LOCATION_FIELDS.ADDRESS)} value={this.props.value.address} style={this.buildStyle(disabled, errors[LOCATION_FIELDS.ADDRESS])} disabled={disabled}/>
                <input id={`${this.props.id}-address-two`} placeholder="Address Line 2" onChange={this.createOnChangeHandler(LOCATION_FIELDS.APT)} value={this.props.value.apt} style={this.buildStyle(disabled, errors[LOCATION_FIELDS.APT])} disabled={disabled}/>
                <input id={`${this.props.id}-city`} required placeholder="City" onChange={this.createOnChangeHandler(LOCATION_FIELDS.CITY)} value={this.props.value.city} style={this.buildStyle(disabled, errors[LOCATION_FIELDS.CITY])} disabled={disabled}/>
                <select id={`${this.props.id}-state`} required onChange={this.createOnChangeHandler(LOCATION_FIELDS.STATE)} value={this.props.value.state} style={this.buildStyle(this.isStatesDisabled(), errors[LOCATION_FIELDS.STATE])} disabled={this.isStatesDisabled()}>
                    <option value="" selected disabled hidden>{'Choose State'}</option>
                    {this.buildStateOptions()}
                </select>
                <input id={`${this.props.id}-zip-code`} required placeholder="Zip Code" onChange={this.createOnChangeHandler(LOCATION_FIELDS.ZIP_CODE)} value={this.props.value.zipCode} style={this.buildStyle(disabled, errors[LOCATION_FIELDS.ZIP_CODE])} disabled={disabled}/>
                <select id={`${this.props.id}-country`} required onChange={this.createOnChangeHandler(LOCATION_FIELDS.COUNTRY)} value={this.props.value.country} style={this.buildStyle(disabled, errors[LOCATION_FIELDS.COUNTRY])} disabled={disabled}>
                    {this.buildCountryOptions()}
                </select>
                <input id={`${this.props.id}-phone`} required placeholder="Phone" onChange={this.createOnChangeHandler(LOCATION_FIELDS.PHONE_NUMBER)} value={this.props.value.phone} style={this.buildStyle(disabled, errors[LOCATION_FIELDS.PHONE_NUMBER]) } disabled={disabled}/>
            </div>
        );
    }
}

LocationFields.propTypes = {
    errors: PropTypes.object,
    onChange: PropTypes.func,
    disabled: PropTypes.bool,
    id: PropTypes.string,
    value: PropTypes.object
};

const mapStateToProps = (state, ownProps) => {
    return {
        id: ownProps.id,
        disabled: ownProps.disabled,
        errors: ownProps.profileToEdit[mapProfileFieldToKey[ownProps.fieldToEdit]].errors,
        value: ownProps.profileToEdit[mapProfileFieldToKey[ownProps.fieldToEdit]],
    };
};

const mapDispatchToProps = (dispatch, ownProps) => {
    return {
        onChange: (changes) => {
            dispatch(profileActions.edit(
                ownProps.profileToEdit.id,
                ownProps.fieldToEdit,
                changes.value,
                changes.field,
            ));
        },
    };
};

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(LocationFields);
