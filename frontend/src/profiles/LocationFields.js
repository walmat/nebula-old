import React, { Component } from 'react';
import PropTypes from 'prop-types';
import validationStatus from '../utils/validationStatus';

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

    onFirstNameChange = (event) => {
        let location = this.props.value;
        location.firstName = event.target.value;
        this.broadCastChanges(location, 'firstName');
    }

    onLastNameChange = (event) => {
        let location = this.props.value;
        location.lastName = event.target.value;
        this.broadCastChanges(location, 'lastName');
    }

    onAddressChange = (event) => {
        let location = this.props.value;
        location.address = event.target.value;
        this.broadCastChanges(location, 'address');
    }

    onAptChange = (event) => {
        let location = this.props.value;
        location.apt = event.target.value;
        this.broadCastChanges(location, 'apt');
    }

    onCityChange = (event) => {
        let location = this.props.value;
        location.city = event.target.value;
        this.broadCastChanges(location, 'city');
    }

    onZipCodeChange = (event) => {
        let location = this.props.value;
        location.zipCode = event.target.value;
        this.broadCastChanges(location, 'zipCode');
    }

    onPhoneNumberChange = (event) => {
        let location = this.props.value;
        location.phone = event.target.value;
        this.broadCastChanges(location, 'phone');
    }

    onCountryChange = (event) => {
        let location = this.props.value;
        location.country = event.target.value;
        this.broadCastChanges(location, 'country');
    }

    onStateChange = (event) => {
        let location = this.props.value;
        location.state = event.target.value;
        this.broadCastChanges(location, 'state');
    }

    buildStyle = (disabled, errors) => {
        let style = {};
        style.backgroundColor = disabled ? '#e5e5e5' : '#F5F5F5';
        style = Object.assign(style, validationStatus(errors));
        return style;
    }

	render() {
        const errors = this.props.errors;
        const disabled = this.props.disabled;
        return (
            <div>
                <input id={`${this.props.id}-first-name`} placeholder="First Name" onChange={this.onFirstNameChange} value={this.props.value.firstName} style={this.buildStyle(disabled, errors['/firstName'])} disabled={disabled} />
                <input id={`${this.props.id}-last-name`} placeholder="Last Name" onChange={this.onLastNameChange} value={this.props.value.lastName} style={this.buildStyle(disabled, errors['/lastName'])} disabled={disabled}/>
                <input id={`${this.props.id}-address-one`} placeholder="Address Line 1" onChange={this.onAddressChange} value={this.props.value.address} style={this.buildStyle(disabled, errors['/address'])} disabled={disabled}/>
                <input id={`${this.props.id}-address-two`} placeholder="Address Line 2" onChange={this.onAptChange} value={this.props.value.apt} style={this.buildStyle(disabled, errors['/apt'])} disabled={disabled}/>
                <input id={`${this.props.id}-city`} placeholder="City" onChange={this.onCityChange} value={this.props.value.city} style={this.buildStyle(disabled, errors['/city'])} disabled={disabled}/>
                <select id={`${this.props.id}-state`} onChange={this.onStateChange} selected={this.props.value.state} style={this.buildStyle(disabled, errors['/state'])} disabled={disabled}>
                    <option>Alaska</option>
                </select>
                <input id={`${this.props.id}-zip-code`} placeholder="Zip Code" onChange={this.onZipCodeChange} value={this.props.value.zipCode} style={this.buildStyle(disabled, errors['/zipCode'])} disabled={disabled}/>
                <select id={`${this.props.id}-country`} onChange={this.onCountryChange} selected={this.props.value.country} style={this.buildStyle(disabled, errors['/country'])} disabled={disabled}>
                    <option>United States</option>
                </select>
                <input id={`${this.props.id}-phone`} placeholder="Phone" onChange={this.onPhoneNumberChange} value={this.props.value.phone} style={this.buildStyle(disabled, errors['/phone']) } disabled={disabled}/>
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