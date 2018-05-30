import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import validationStatus from '../utils/validationStatus';
import getAllCountires from '../getAllCountires';
import getAllStates from '../getAllStates';
import { editLocation, LOCATION_FIELDS } from '../state/actions/Actions.js';
import './Profiles.css';

const errorStyle = {
    borderColor: 'red'
};

class LocationFields extends Component {

    constructor(props) {
        super(props);
	}

	broadCastChanges = (updatedLocation, fieldChanged) => {
		this.props.onChange(updatedLocation, fieldChanged);
	}
	setBorderColor(validationErrors) {
    return validationErrors ? errorStyle : {};
  }

  createOnChangeHandler(field) {
    return (event) => {
      this.props.dispatch(editLocation(field, event.target.value));
    }
  }

  buildStyle = (disabled, errors) => {
      let style = {};
      style.backgroundColor = disabled ? '#e5e5e5' : '#F5F5F5';
      style = Object.assign(style, validationStatus(errors));
      return style;
  }

  buildCountryOptions = () => {
      let countries = getAllCountires();
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
                <input id={`${this.props.id}-first-name`} placeholder="First Name" onChange={this.createOnChangeHandler(LOCATION_FIELDS.FIRST_NAME)} value={this.props.value.firstName} style={this.buildStyle(disabled, errors['/firstName'])} disabled={disabled} />
                <input id={`${this.props.id}-last-name`} placeholder="Last Name" onChange={this.createOnChangeHandler(LOCATION_FIELDS.LAST_NAME)} value={this.props.value.lastName} style={this.buildStyle(disabled, errors['/lastName'])} disabled={disabled}/>
                <input id={`${this.props.id}-address-one`} placeholder="Address Line 1" onChange={this.createOnChangeHandler(LOCATION_FIELDS.ADDRESS)} value={this.props.value.address} style={this.buildStyle(disabled, errors['/address'])} disabled={disabled}/>
                <input id={`${this.props.id}-address-two`} placeholder="Address Line 2" onChange={this.createOnChangeHandler(LOCATION_FIELDS.APT)} value={this.props.value.apt} style={this.buildStyle(disabled, errors['/apt'])} disabled={disabled}/>
                <input id={`${this.props.id}-city`} placeholder="City" onChange={this.createOnChangeHandler(LOCATION_FIELDS.CITY)} value={this.props.value.city} style={this.buildStyle(disabled, errors['/city'])} disabled={disabled}/>
                <select id={`${this.props.id}-state`} onChange={this.createOnChangeHandler(LOCATION_FIELDS.STATE)} value={this.props.value.state} style={this.buildStyle(this.isStatesDisabled(), errors['/state'])} disabled={this.isStatesDisabled()}>
                    <option value="" selected disabled hidden>{'Choose State'}</option>
                    {this.buildStateOptions()}
                </select>
                <input id={`${this.props.id}-zip-code`} placeholder="Zip Code" onChange={this.createOnChangeHandler(LOCATION_FIELDS.ZIP_CODE)} value={this.props.value.zipCode} style={this.buildStyle(disabled, errors['/zipCode'])} disabled={disabled}/>
                <select id={`${this.props.id}-country`} onChange={this.createOnChangeHandler(LOCATION_FIELDS.COUNTRY)} value={this.props.value.country} style={this.buildStyle(disabled, errors['/country'])} disabled={disabled}>
                    {this.buildCountryOptions()}
                </select>
                <input id={`${this.props.id}-phone`} placeholder="Phone" onChange={this.createOnChangeHandler(LOCATION_FIELDS.PHONE_NUMBER)} value={this.props.value.phone} style={this.buildStyle(disabled, errors['/phone']) } disabled={disabled}/>
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

export default LocationFields;
