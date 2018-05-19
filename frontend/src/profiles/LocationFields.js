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
        this.state = {
            errors: {},
            shipping: {
				firstName: '',
				lastName: '',
				address: '',
				apt: '',
				city: '',
				country: '',
				state: '',
				zipCode: '',
				phone: ''
			}
        }
	}

	broadCastChanges = (fieldChanged) => {
		this.props.onChange(this.state.shipping, fieldChanged);
	}
	setBorderColor(validationErrors) {
        return validationErrors ? errorStyle : {};
    }

    onFirstNameChange = (event) => {
        let shipping = this.state.shipping;
        shipping.firstName = event.target.value;
        this.setState(shipping, this.broadCastChanges('firstName'));
    }

    onLastNameChange = (event) => {
        let shipping = this.state.shipping;
        shipping.lastName = event.target.value;
        this.setState(shipping, this.broadCastChanges('lastName'));
    }

    onAddressChange = (event) => {
        let shipping = this.state.shipping;
        shipping.address = event.target.value;
        this.setState(shipping, this.broadCastChanges('address'));
    }

    onAptChange = (event) => {
        let shipping = this.state.shipping;
        shipping.apt = event.target.value;
        this.setState(shipping, this.broadCastChanges('apt'));
    }

    onCityChange = (event) => {
        let shipping = this.state.shipping;
        shipping.city = event.target.value;
        this.setState(shipping, this.broadCastChanges('city'));
    }

    onZipCodeChange = (event) => {
        let shipping = this.state.shipping;
        shipping.zipCode = event.target.value;
        this.setState(shipping, this.broadCastChanges('zipCode'));
    }

    onPhoneNumberChange = (event) => {
        let shipping = this.state.shipping;
        shipping.phone = event.target.value;
        this.setState(shipping, this.broadCastChanges('phone'));
    }

    onCountryChange = (event) => {
        let shipping = this.state.shipping;
        shipping.country = event.target.value;
        this.setState(shipping, this.broadCastChanges('country'));
    }

    onStateChange = (event) => {
        let shipping = this.state.shipping;
        shipping.state = event.target.value;
        this.setState(shipping, this.broadCastChanges('state'));
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
                <input id={`${this.props.id}-first-name`} placeholder="First Name" onChange={this.onFirstNameChange} value={this.state.shipping.firstName} style={this.buildStyle(disabled, errors['/firstName'])} disabled={disabled} />
                <input id={`${this.props.id}-last-name`} placeholder="Last Name" onChange={this.onLastNameChange} value={this.state.shipping.lastName} style={this.buildStyle(disabled, errors['/lastName'])} disabled={disabled}/>
                <input id={`${this.props.id}-address-one`} placeholder="Address Line 1" onChange={this.onAddressChange} value={this.state.shipping.address} style={this.buildStyle(disabled, errors['/address'])} disabled={disabled}/>
                <input id={`${this.props.id}-address-two`} placeholder="Address Line 2" onChange={this.onAptChange} value={this.state.shipping.apt} style={this.buildStyle(disabled, errors['/apt'])} disabled={disabled}/>
                <input id={`${this.props.id}-city`} placeholder="City" onChange={this.onCityChange} value={this.state.shipping.city} style={this.buildStyle(disabled, errors['/city'])} disabled={disabled}/>
                <select id={`${this.props.id}-state`} onChange={this.onStateChange} selected={this.state.shipping.state} style={this.buildStyle(disabled, errors['/state'])} disabled={disabled}>
                    <option>Alaska</option>
                </select>
                <input id={`${this.props.id}-zip-code`} placeholder="Zip Code" onChange={this.onZipCodeChange} value={this.state.shipping.zipCode} style={this.buildStyle(disabled, errors['/zipCode'])} disabled={disabled}/>
                <select id={`${this.props.id}-country`} onChange={this.onCountryChange} selected={this.state.shipping.country} style={this.buildStyle(disabled, errors['/country'])} disabled={disabled}>
                    <option>United States</option>
                </select>
                <input id={`${this.props.id}-phone`} placeholder="Phone" onChange={this.onPhoneNumberChange} value={this.state.shipping.phone} style={this.buildStyle(disabled, errors['/phone']) } disabled={disabled}/>
            </div>
        );
    }
}

LocationFields.propTypes = {
    errors: PropTypes.object,
    onChange: PropTypes.func,
    disabled: PropTypes.bool,
    id: PropTypes.string,
};

export default LocationFields;